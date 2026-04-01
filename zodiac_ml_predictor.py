#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生肖预测2.0 - 机器学习模型
使用RandomForest构建多分类模型预测下一期生肖
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, log_loss, classification_report
import json
import pickle
import warnings
warnings.filterwarnings('ignore')

# 生肖映射配置
ZODIAC_CONFIG = {
    # 生肖ID到名称的映射
    'id_to_name': {
        1: '马', 2: '蛇', 3: '龙', 4: '兔', 5: '虎', 6: '牛',
        7: '鼠', 8: '猪', 9: '狗', 10: '鸡', 11: '猴', 12: '羊'
    },
    # 生肖到五行的映射
    'zodiac_to_element': {
        1: '火',   # 马
        2: '火',   # 蛇
        3: '土',   # 龙
        4: '木',   # 兔
        5: '木',   # 虎
        6: '土',   # 牛
        7: '水',   # 鼠
        8: '水',   # 猪
        9: '土',   # 狗
        10: '金',  # 鸡
        11: '金',  # 猴
        12: '土'   # 羊
    },
    # 生肖到波色的映射
    'zodiac_to_color': {
        1: '红', 2: '红', 3: '红', 4: '绿', 5: '蓝', 6: '绿',
        7: '红', 8: '蓝', 9: '绿', 10: '红', 11: '蓝', 12: '绿'
    },
    # 五行相生关系
    'element_generate': {
        '金': '水',
        '水': '木',
        '木': '火',
        '火': '土',
        '土': '金'
    },
    # 五行相克关系
    'element_overcome': {
        '金': '木',
        '木': '土',
        '土': '水',
        '水': '火',
        '火': '金'
    }
}


def get_element_relation(element1, element2):
    """
    获取两个五行元素之间的关系
    返回: 0=相克, 1=相同, 2=相生
    """
    if element1 == element2:
        return 1  # 相同
    elif ZODIAC_CONFIG['element_generate'].get(element1) == element2:
        return 2  # 相生
    else:
        return 0  # 相克


def get_zodiac_attributes(zodiac_id):
    """
    获取生肖的各种属性
    """
    # 单双
    odd_even = zodiac_id % 2  # 0=双, 1=单
    
    # 大小 (1-6小, 7-12大)
    big_small = 1 if zodiac_id >= 7 else 0  # 0=小, 1=大
    
    # 区间 (1-4, 5-8, 9-12)
    if zodiac_id <= 4:
        zone = 0
    elif zodiac_id <= 8:
        zone = 1
    else:
        zone = 2
    
    # 头数 (1-9为0, 10-12为1)
    head = 1 if zodiac_id >= 10 else 0
    
    # 尾数
    tail = zodiac_id % 10
    
    return {
        'odd_even': odd_even,
        'big_small': big_small,
        'zone': zone,
        'head': head,
        'tail': tail,
        'element': ZODIAC_CONFIG['zodiac_to_element'][zodiac_id],
        'color': ZODIAC_CONFIG['zodiac_to_color'][zodiac_id]
    }


def load_data(file_path):
    """
    读取CSV数据并按期号排序
    
    Args:
        file_path: CSV文件路径
    
    Returns:
        DataFrame: 排序后的数据
    """
    try:
        df = pd.read_csv(file_path)
        # 确保数据类型正确
        df['period'] = df['period'].astype(int)
        df['zodiac'] = df['zodiac'].astype(int)
        
        # 按期号排序
        df = df.sort_values('period').reset_index(drop=True)
        
        print(f"数据加载成功: {len(df)} 条记录")
        print(f"期号范围: {df['period'].min()} - {df['period'].max()}")
        print(f"生肖分布:\n{df['zodiac'].value_counts().sort_index()}")
        
        return df
    except Exception as e:
        print(f"数据加载失败: {e}")
        return None


def build_features(df):
    """
    为每一期构建特征向量和标签
    
    Args:
        df: 包含period和zodiac的DataFrame
    
    Returns:
        X: 特征矩阵
        y: 标签
        feature_names: 特征名称列表
    """
    n_samples = len(df)
    n_zodiacs = 12
    
    # 初始化特征列表
    features_list = []
    labels = []
    
    # 特征名称
    feature_names = []
    
    # 基础统计特征
    for i in range(1, n_zodiacs + 1):
        feature_names.extend([
            f'zodiac_{i}_miss',           # 当前遗漏
            f'zodiac_{i}_miss_ratio',     # 遗漏比例
            f'zodiac_{i}_count_10',       # 近10期出现次数
            f'zodiac_{i}_count_20',       # 近20期出现次数
            f'zodiac_{i}_count_50',       # 近50期出现次数
            f'zodiac_{i}_freq_10',        # 近10期频率
            f'zodiac_{i}_freq_20',        # 近20期频率
            f'zodiac_{i}_rank',           # 热门排名
            f'zodiac_{i}_consecutive',    # 连开次数
            f'zodiac_{i}_break',          # 连断状态
        ])
    
    # 动态特征（与上期关联）
    feature_names.extend([
        'prev_zodiac',           # 上期生肖
        'position_gap',          # 位置间隔
        'element_relation',      # 五行关系
        'color_same',            # 波色相同
        'odd_even_same',         # 单双相同
        'big_small_same',        # 大小相同
        'zone_same',             # 区间相同
        'head_same',             # 头数相同
        'tail_same',             # 尾数相同
    ])
    
    # 时序特征
    for i in range(1, n_zodiacs + 1):
        feature_names.extend([
            f'zodiac_{i}_interval_mean',   # 间隔均值
            f'zodiac_{i}_interval_std',    # 间隔标准差
            f'zodiac_{i}_rank_change',     # 热度变化
        ])
    
    print(f"特征维度: {len(feature_names)}")
    
    # 从第51期开始构建特征（确保有足够的历史数据）
    start_idx = 50
    
    for idx in range(start_idx, n_samples):
        # 当前期数据
        current_zodiac = df.iloc[idx]['zodiac']
        
        # 历史数据（当前期之前）
        history = df.iloc[:idx]
        
        features = []
        
        # ========== 3.1 基础统计特征 ==========
        # 计算每个生肖的特征
        miss_counts = {i: 0 for i in range(1, n_zodiacs + 1)}
        max_miss = {i: 0 for i in range(1, n_zodiacs + 1)}
        
        # 计算遗漏
        for z in range(1, n_zodiacs + 1):
            last_appear = -1
            for i, row in history.iterrows():
                if row['zodiac'] == z:
                    last_appear = i
            if last_appear == -1:
                miss_counts[z] = len(history)
            else:
                miss_counts[z] = idx - last_appear - 1
        
        # 计算最大遗漏
        for z in range(1, n_zodiacs + 1):
            current_miss = 0
            for i, row in history.iterrows():
                if row['zodiac'] == z:
                    max_miss[z] = max(max_miss[z], current_miss)
                    current_miss = 0
                else:
                    current_miss += 1
        
        # 近N期统计
        recent_10 = history.tail(10)
        recent_20 = history.tail(20)
        recent_50 = history.tail(50)
        
        # 计算排名
        counts_20 = recent_20['zodiac'].value_counts().to_dict()
        ranks = {}
        for z in range(1, n_zodiacs + 1):
            count = counts_20.get(z, 0)
            # 计算排名（出现次数越多，排名越靠前）
            rank = 1
            for other_z in range(1, n_zodiacs + 1):
                if counts_20.get(other_z, 0) > count:
                    rank += 1
            ranks[z] = rank
        
        # 计算连开次数
        consecutive = {i: 0 for i in range(1, n_zodiacs + 1)}
        break_state = {i: 0 for i in range(1, n_zodiacs + 1)}
        
        for z in range(1, n_zodiacs + 1):
            cons = 0
            for i in range(len(history) - 1, -1, -1):
                if history.iloc[i]['zodiac'] == z:
                    cons += 1
                else:
                    break
            consecutive[z] = cons
            
            # 连断状态：上期开出且前一期未开
            if len(history) >= 2:
                last = history.iloc[-1]['zodiac']
                second_last = history.iloc[-2]['zodiac']
                break_state[z] = 1 if (last == z and second_last != z) else 0
        
        # 添加基础统计特征
        for z in range(1, n_zodiacs + 1):
            miss = miss_counts[z]
            max_m = max_miss[z] if max_miss[z] > 0 else 1
            
            features.extend([
                miss,                                           # 当前遗漏
                miss / max_m,                                   # 遗漏比例
                (recent_10['zodiac'] == z).sum(),              # 近10期次数
                (recent_20['zodiac'] == z).sum(),              # 近20期次数
                (recent_50['zodiac'] == z).sum(),              # 近50期次数
                (recent_10['zodiac'] == z).sum() / 10,         # 近10期频率
                (recent_20['zodiac'] == z).sum() / 20,         # 近20期频率
                ranks[z],                                       # 热门排名
                consecutive[z],                                 # 连开次数
                break_state[z],                                 # 连断状态
            ])
        
        # ========== 3.2 动态特征 ==========
        # 上期生肖
        prev_zodiac = history.iloc[-1]['zodiac']
        features.append(prev_zodiac)
        
        # 位置间隔
        position_gap = abs(current_zodiac - prev_zodiac)
        if position_gap > 6:
            position_gap = 12 - position_gap
        features.append(position_gap)
        
        # 五行关系
        prev_element = ZODIAC_CONFIG['zodiac_to_element'][prev_zodiac]
        curr_element = ZODIAC_CONFIG['zodiac_to_element'][current_zodiac]
        element_relation = get_element_relation(prev_element, curr_element)
        features.append(element_relation)
        
        # 其他属性比较
        prev_attr = get_zodiac_attributes(prev_zodiac)
        curr_attr = get_zodiac_attributes(current_zodiac)
        
        features.extend([
            1 if prev_attr['color'] == curr_attr['color'] else 0,      # 波色相同
            1 if prev_attr['odd_even'] == curr_attr['odd_even'] else 0, # 单双相同
            1 if prev_attr['big_small'] == curr_attr['big_small'] else 0, # 大小相同
            1 if prev_attr['zone'] == curr_attr['zone'] else 0,        # 区间相同
            1 if prev_attr['head'] == curr_attr['head'] else 0,        # 头数相同
            1 if prev_attr['tail'] == curr_attr['tail'] else 0,        # 尾数相同
        ])
        
        # ========== 3.3 时序特征 ==========
        for z in range(1, n_zodiacs + 1):
            # 获取该生肖的历史出现位置
            appear_indices = []
            for i, row in history.iterrows():
                if row['zodiac'] == z:
                    appear_indices.append(i)
            
            # 计算间隔
            if len(appear_indices) >= 2:
                intervals = [appear_indices[i] - appear_indices[i-1] 
                           for i in range(1, len(appear_indices))]
                interval_mean = np.mean(intervals[-5:])  # 最近5次
                interval_std = np.std(intervals[-5:]) if len(intervals) >= 5 else 0
            else:
                interval_mean = 0
                interval_std = 0
            
            features.extend([interval_mean, interval_std])
            
            # 热度变化（排名变化）
            if len(history) >= 20:
                recent_20_prev = history.iloc[-21:-1]
                counts_20_prev = recent_20_prev['zodiac'].value_counts().to_dict()
                rank_prev = 1
                count_prev = counts_20_prev.get(z, 0)
                for other_z in range(1, n_zodiacs + 1):
                    if counts_20_prev.get(other_z, 0) > count_prev:
                        rank_prev += 1
                rank_change = rank_prev - ranks[z]
            else:
                rank_change = 0
            
            features.append(rank_change)
        
        features_list.append(features)
        labels.append(current_zodiac - 1)  # 转换为0-11的标签
    
    X = np.array(features_list)
    y = np.array(labels)
    
    print(f"特征矩阵形状: {X.shape}")
    print(f"标签形状: {y.shape}")
    
    return X, y, feature_names


def train_model(X_train, y_train):
    """
    训练RandomForest模型
    
    Args:
        X_train: 训练特征
        y_train: 训练标签
    
    Returns:
        model: 训练好的模型
    """
    print("\n开始训练模型...")
    
    # 计算类别权重
    class_counts = np.bincount(y_train)
    total = len(y_train)
    class_weights = {i: total / (12 * count) if count > 0 else 1.0 
                    for i, count in enumerate(class_counts)}
    
    print(f"类别权重: {class_weights}")
    
    # 创建样本权重
    sample_weights = np.array([class_weights[y] for y in y_train])
    
    # 创建RandomForest分类器
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        class_weight='balanced',
        n_jobs=-1
    )
    
    # 训练模型
    model.fit(X_train, y_train, sample_weight=sample_weights)
    
    print("模型训练完成")
    
    return model


def evaluate_model(model, X_test, y_test):
    """
    评估模型性能
    
    Args:
        model: 训练好的模型
        X_test: 测试特征
        y_test: 测试标签
    """
    print("\n========== 模型评估 ==========")
    
    # 预测概率
    y_pred_proba = model.predict_proba(X_test)
    
    # 预测类别
    y_pred = model.predict(X_test)
    
    # 准确率
    accuracy = accuracy_score(y_test, y_pred)
    print(f"准确率: {accuracy:.4f}")
    
    # Top-3 准确率
    top3_correct = 0
    for i in range(len(y_test)):
        top3_indices = np.argsort(y_pred_proba[i])[-3:]
        if y_test[i] in top3_indices:
            top3_correct += 1
    top3_accuracy = top3_correct / len(y_test)
    print(f"Top-3 准确率: {top3_accuracy:.4f}")
    
    # 对数损失
    try:
        loss = log_loss(y_test, y_pred_proba, labels=list(range(12)))
        print(f"对数损失: {loss:.4f}")
    except:
        print(f"对数损失: 无法计算（测试集类别不全）")
    
    # 分类报告
    print("\n分类报告:")
    target_names = [ZODIAC_CONFIG['id_to_name'][i+1] for i in range(12)]
    try:
        print(classification_report(y_test, y_pred, target_names=target_names, labels=list(range(12))))
    except:
        print("分类报告: 无法生成（测试集类别不全）")
    
    return {
        'accuracy': accuracy,
        'top3_accuracy': top3_accuracy,
        'log_loss': loss
    }


def get_feature_importance(model, feature_names, top_n=20):
    """
    获取特征重要性
    
    Args:
        model: 训练好的模型
        feature_names: 特征名称列表
        top_n: 显示前N个重要特征
    """
    print(f"\n========== 前{top_n}个重要特征 ==========")
    
    importance = model.feature_importances_
    indices = np.argsort(importance)[::-1]
    
    for i in range(min(top_n, len(feature_names))):
        idx = indices[i]
        print(f"{i+1:2d}. {feature_names[idx]:30s} {importance[idx]:.4f}")
    
    return importance


def predict_next(model, last_period_data, all_history):
    """
    预测下一期的生肖概率
    
    Args:
        model: 训练好的模型
        last_period_data: 最近一期的数据
        all_history: 所有历史数据
    
    Returns:
        probabilities: 12个生肖的概率
    """
    # 构建特征（与build_features类似，但只构建一个样本）
    features = []
    n_zodiacs = 12
    
    # 历史数据
    history = all_history
    idx = len(history)
    
    # 基础统计特征
    miss_counts = {i: 0 for i in range(1, n_zodiacs + 1)}
    max_miss = {i: 0 for i in range(1, n_zodiacs + 1)}
    
    for z in range(1, n_zodiacs + 1):
        last_appear = -1
        for i, row in history.iterrows():
            if row['zodiac'] == z:
                last_appear = i
        if last_appear == -1:
            miss_counts[z] = len(history)
        else:
            miss_counts[z] = idx - last_appear - 1
    
    for z in range(1, n_zodiacs + 1):
        current_miss = 0
        for i, row in history.iterrows():
            if row['zodiac'] == z:
                max_miss[z] = max(max_miss[z], current_miss)
                current_miss = 0
            else:
                current_miss += 1
    
    recent_10 = history.tail(10)
    recent_20 = history.tail(20)
    recent_50 = history.tail(50)
    
    counts_20 = recent_20['zodiac'].value_counts().to_dict()
    ranks = {}
    for z in range(1, n_zodiacs + 1):
        count = counts_20.get(z, 0)
        rank = 1
        for other_z in range(1, n_zodiacs + 1):
            if counts_20.get(other_z, 0) > count:
                rank += 1
        ranks[z] = rank
    
    consecutive = {i: 0 for i in range(1, n_zodiacs + 1)}
    break_state = {i: 0 for i in range(1, n_zodiacs + 1)}
    
    for z in range(1, n_zodiacs + 1):
        cons = 0
        for i in range(len(history) - 1, -1, -1):
            if history.iloc[i]['zodiac'] == z:
                cons += 1
            else:
                break
        consecutive[z] = cons
        
        if len(history) >= 2:
            last = history.iloc[-1]['zodiac']
            second_last = history.iloc[-2]['zodiac']
            break_state[z] = 1 if (last == z and second_last != z) else 0
    
    for z in range(1, n_zodiacs + 1):
        miss = miss_counts[z]
        max_m = max_miss[z] if max_miss[z] > 0 else 1
        
        features.extend([
            miss,
            miss / max_m,
            (recent_10['zodiac'] == z).sum(),
            (recent_20['zodiac'] == z).sum(),
            (recent_50['zodiac'] == z).sum(),
            (recent_10['zodiac'] == z).sum() / 10,
            (recent_20['zodiac'] == z).sum() / 20,
            ranks[z],
            consecutive[z],
            break_state[z],
        ])
    
    # 动态特征
    prev_zodiac = history.iloc[-1]['zodiac']
    features.append(prev_zodiac)
    features.append(0)  # 位置间隔（无法预知）
    features.append(1)  # 五行关系（默认相同）
    
    prev_attr = get_zodiac_attributes(prev_zodiac)
    features.extend([0, 0, 0, 0, 0, 0])  # 其他比较特征（无法预知）
    
    # 时序特征
    for z in range(1, n_zodiacs + 1):
        appear_indices = []
        for i, row in history.iterrows():
            if row['zodiac'] == z:
                appear_indices.append(i)
        
        if len(appear_indices) >= 2:
            intervals = [appear_indices[i] - appear_indices[i-1] 
                       for i in range(1, len(appear_indices))]
            interval_mean = np.mean(intervals[-5:])
            interval_std = np.std(intervals[-5:]) if len(intervals) >= 5 else 0
        else:
            interval_mean = 0
            interval_std = 0
        
        features.extend([interval_mean, interval_std, 0])
    
    X = np.array([features])
    
    # 预测概率
    probabilities = model.predict_proba(X)[0]
    
    return probabilities


def save_model(model, file_path='zodiac_model.pkl'):
    """
    保存模型
    
    Args:
        model: 训练好的模型
        file_path: 保存路径
    """
    with open(file_path, 'wb') as f:
        pickle.dump(model, f)
    print(f"\n模型已保存: {file_path}")


def load_model(file_path='zodiac_model.pkl'):
    """
    加载模型
    
    Args:
        file_path: 模型文件路径
    
    Returns:
        model: 加载的模型
    """
    with open(file_path, 'rb') as f:
        model = pickle.load(f)
    print(f"模型已加载: {file_path}")
    return model


def main():
    """
    主程序
    """
    print("=" * 60)
    print("生肖预测2.0 - 机器学习模型")
    print("=" * 60)
    
    # 1. 加载数据
    df = load_data('lottery_history.csv')
    if df is None:
        print("请确保 lottery_history.csv 文件存在")
        return
    
    # 2. 构建特征
    X, y, feature_names = build_features(df)
    
    # 3. 划分训练集和测试集（按时间顺序）
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    
    print(f"\n训练集大小: {len(X_train)}")
    print(f"测试集大小: {len(X_test)}")
    
    # 4. 训练模型
    model = train_model(X_train, y_train)
    
    # 5. 评估模型
    metrics = evaluate_model(model, X_test, y_test)
    
    # 6. 特征重要性
    get_feature_importance(model, feature_names)
    
    # 7. 预测下一期
    print("\n========== 下一期预测 ==========")
    probabilities = predict_next(model, df.iloc[-1], df)
    
    # 排序并显示概率
    zodiac_probs = [(i+1, ZODIAC_CONFIG['id_to_name'][i+1], probabilities[i]) 
                   for i in range(12)]
    zodiac_probs.sort(key=lambda x: x[2], reverse=True)
    
    print("\n生肖预测概率（按概率排序）:")
    print("-" * 40)
    for zodiac_id, zodiac_name, prob in zodiac_probs:
        bar = "█" * int(prob * 50)
        print(f"{zodiac_id:2d}. {zodiac_name}: {prob:.4f} {bar}")
    
    print(f"\n推荐生肖: {zodiac_probs[0][1]} (概率: {zodiac_probs[0][2]:.4f})")
    print(f"次选生肖: {zodiac_probs[1][1]} (概率: {zodiac_probs[1][2]:.4f})")
    print(f"备选生肖: {zodiac_probs[2][1]} (概率: {zodiac_probs[2][2]:.4f})")
    
    # 8. 保存模型
    save_model(model)
    
    print("\n" + "=" * 60)
    print("预测完成")
    print("=" * 60)


if __name__ == '__main__':
    main()
