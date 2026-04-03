#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生肖预测2.0 - API数据训练脚本
使用API返回的结构化数据作为训练数据集，构建预测模型
"""

import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score, GridSearchCV, train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.metrics import mean_absolute_error, accuracy_score, log_loss
import json
import pickle
import warnings
import time
import os
import requests
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
    }
}


def get_api_data(url, params=None):
    """
    从API获取数据
    
    Args:
        url: API地址
        params: 请求参数
    
    Returns:
        dict: API返回的数据
    """
    try:
        response = requests.post(url, json=params)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"API请求失败: {response.status_code}")
            return None
    except Exception as e:
        print(f"API请求异常: {e}")
        return None


def load_history_data(file_path):
    """
    加载历史数据
    
    Args:
        file_path: CSV文件路径
    
    Returns:
        DataFrame: 历史数据
    """
    try:
        df = pd.read_csv(file_path)
        df['period'] = df['period'].astype(int)
        df['zodiac'] = df['zodiac'].astype(int)
        df = df.sort_values('period').reset_index(drop=True)
        return df
    except Exception as e:
        print(f"加载历史数据失败: {e}")
        return None


def build_features(df):
    """
    构建特征
    
    Args:
        df: 历史数据
    
    Returns:
        X: 特征矩阵
        y: 标签
        feature_names: 特征名称
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
            f'zodiac_{i}_count_10',       # 近10期出现次数
            f'zodiac_{i}_count_20',       # 近20期出现次数
            f'zodiac_{i}_freq_10',        # 近10期频率
            f'zodiac_{i}_freq_20',        # 近20期频率
        ])
    
    # 动态特征（与上期关联）
    feature_names.extend([
        'prev_zodiac',           # 上期生肖
        'position_gap',          # 位置间隔
    ])
    
    # 从第21期开始构建特征（确保有足够的历史数据）
    start_idx = 20
    
    for idx in range(start_idx, n_samples):
        # 当前期数据
        current_zodiac = df.iloc[idx]['zodiac']
        
        # 历史数据（当前期之前）
        history = df.iloc[:idx]
        
        features = []
        
        # 基础统计特征
        for z in range(1, n_zodiacs + 1):
            # 计算遗漏
            last_appear = -1
            for i, row in history.iterrows():
                if row['zodiac'] == z:
                    last_appear = i
            if last_appear == -1:
                miss = len(history)
            else:
                miss = idx - last_appear - 1
            
            # 近N期统计
            recent_10 = history.tail(10)
            recent_20 = history.tail(20)
            
            count_10 = (recent_10['zodiac'] == z).sum()
            count_20 = (recent_20['zodiac'] == z).sum()
            freq_10 = count_10 / 10 if len(recent_10) == 10 else 0
            freq_20 = count_20 / 20 if len(recent_20) == 20 else 0
            
            features.extend([miss, count_10, count_20, freq_10, freq_20])
        
        # 动态特征
        prev_zodiac = history.iloc[-1]['zodiac']
        features.append(prev_zodiac)
        
        # 位置间隔
        position_gap = abs(current_zodiac - prev_zodiac)
        if position_gap > 6:
            position_gap = 12 - position_gap
        features.append(position_gap)
        
        features_list.append(features)
        labels.append(current_zodiac - 1)  # 转换为0-11的标签
    
    X = np.array(features_list)
    y = np.array(labels)
    
    return X, y, feature_names


def preprocess_data(X, y):
    """
    数据预处理
    
    Args:
        X: 特征矩阵
        y: 标签
    
    Returns:
        X_scaled: 标准化后的特征矩阵
        y: 标签
    """
    # 标准化特征
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    return X_scaled, y


def evaluate_algorithms(X, y):
    """
    评估多种算法
    
    Args:
        X: 特征矩阵
        y: 标签
    
    Returns:
        results: 算法评估结果
    """
    # 定义算法
    algorithms = {
        'Logistic Regression': LogisticRegression(random_state=42, max_iter=1000),
        'Decision Tree': DecisionTreeClassifier(random_state=42),
        'Random Forest': RandomForestClassifier(random_state=42),
        'Neural Network': MLPClassifier(random_state=42, max_iter=1000)
    }
    
    results = {}
    
    for name, model in algorithms.items():
        print(f"\n评估 {name}...")
        
        # 交叉验证
        start_time = time.time()
        accuracy_scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')
        top3_scores = cross_val_score(model, X, y, cv=5, scoring=lambda clf, X, y: top3_accuracy(clf, X, y))
        training_time = time.time() - start_time
        
        # 训练模型
        model.fit(X, y)
        
        # 计算MAE
        y_pred = model.predict(X)
        mae = mean_absolute_error(y, y_pred)
        
        results[name] = {
            'accuracy': np.mean(accuracy_scores),
            'top3_accuracy': np.mean(top3_scores),
            'mae': mae,
            'training_time': training_time,
            'model': model
        }
        
        print(f"准确率: {np.mean(accuracy_scores):.4f}")
        print(f"Top-3准确率: {np.mean(top3_scores):.4f}")
        print(f"MAE: {mae:.4f}")
        print(f"训练时间: {training_time:.2f}秒")
    
    return results

def top3_accuracy(model, X, y):
    """
    计算Top-3准确率
    
    Args:
        model: 模型
        X: 特征矩阵
        y: 标签
    
    Returns:
        float: Top-3准确率
    """
    y_pred_proba = model.predict_proba(X)
    top3_correct = 0
    for i in range(len(y)):
        top3_indices = np.argsort(y_pred_proba[i])[-3:]
        if y[i] in top3_indices:
            top3_correct += 1
    return top3_correct / len(y)

def hyperparameter_tuning(X, y):
    """
    超参数调优
    
    Args:
        X: 特征矩阵
        y: 标签
    
    Returns:
        best_model: 最佳模型
    """
    print("\n" + "=" * 60)
    print("超参数调优")
    print("=" * 60)
    
    # 定义参数网格
    param_grid = {
        'n_estimators': [100, 200, 300],
        'max_depth': [5, 10, 15],
        'min_samples_split': [2, 4, 6],
        'min_samples_leaf': [1, 2, 3]
    }
    
    # 创建模型
    model = RandomForestClassifier(random_state=42)
    
    # 网格搜索
    grid_search = GridSearchCV(model, param_grid, cv=5, scoring='accuracy', n_jobs=-1)
    grid_search.fit(X, y)
    
    print(f"最佳参数: {grid_search.best_params_}")
    print(f"最佳准确率: {grid_search.best_score_:.4f}")
    
    return grid_search.best_estimator_

def feature_importance_analysis(model, feature_names):
    """
    特征重要性分析
    
    Args:
        model: 模型
        feature_names: 特征名称
    
    Returns:
        importance: 特征重要性
    """
    if hasattr(model, 'feature_importances_'):
        importance = model.feature_importances_
        indices = np.argsort(importance)[::-1]
        
        print("\n" + "=" * 60)
        print("特征重要性分析")
        print("=" * 60)
        print("前10个重要特征:")
        for i in range(min(10, len(feature_names))):
            idx = indices[i]
            print(f"{i+1:2d}. {feature_names[idx]:30s} {importance[idx]:.4f}")
        
        return importance
    else:
        print("\n该模型不支持特征重要性分析")
        return None

def generate_report(results, best_model, feature_importance, X, y, feature_names):
    """
    生成训练报告
    
    Args:
        results: 算法评估结果
        best_model: 最佳模型
        feature_importance: 特征重要性
        X: 特征矩阵
        y: 标签
        feature_names: 特征名称
    """
    print("\n" + "=" * 80)
    print("生肖预测模型训练报告")
    print("=" * 80)
    
    print("\n一、数据概览")
    print("-" * 40)
    print(f"训练数据量: {len(X)} 条")
    print(f"特征维度: {X.shape[1]}")
    print(f"标签类别: {len(np.unique(y))}")
    
    print("\n二、算法评估结果")
    print("-" * 40)
    print(f"{'算法':<20} {'准确率':<10} {'Top-3准确率':<12} {'MAE':<10} {'训练时间(秒)'}")
    print("-" * 80)
    for name, result in results.items():
        print(f"{name:<20} {result['accuracy']:<10.4f} {result['top3_accuracy']:<12.4f} {result['mae']:<10.4f} {result['training_time']:<10.2f}")
    
    # 选择最佳模型
    best_algorithm = max(results, key=lambda x: results[x]['accuracy'])
    best_result = results[best_algorithm]
    
    print("\n三、最佳模型分析")
    print("-" * 40)
    print(f"最佳算法: {best_algorithm}")
    print(f"准确率: {best_result['accuracy']:.4f}")
    print(f"Top-3准确率: {best_result['top3_accuracy']:.4f}")
    print(f"MAE: {best_result['mae']:.4f}")
    
    # 检查是否达到预设指标
    if best_result['mae'] < 0.5:
        print("\n✅ 模型达到预设准确率指标 (MAE < 0.5)")
    else:
        print("\n❌ 模型未达到预设准确率指标 (MAE < 0.5)")
    
    # 特征重要性
    if feature_importance is not None:
        print("\n四、特征重要性分析")
        print("-" * 40)
        print("前10个重要特征:")
        indices = np.argsort(feature_importance)[::-1]
        for i in range(min(10, len(feature_names))):
            idx = indices[i]
            print(f"{i+1:2d}. {feature_names[idx]:30s} {feature_importance[idx]:.4f}")
    
    print("\n五、改进建议")
    print("-" * 40)
    print("1. 数据方面:")
    print("   - 增加历史数据量，提高模型稳定性")
    print("   - 引入更多特征，如日期特征、节假日特征等")
    print("   - 定期更新数据，确保模型能够适应最新的开奖趋势")
    
    print("\n2. 模型方面:")
    print("   - 尝试更多算法，如XGBoost、LightGBM等")
    print("   - 进一步优化超参数")
    print("   - 考虑集成学习，结合多个模型的预测结果")
    
    print("\n3. 系统方面:")
    print("   - 增加模型缓存机制，提高API响应速度")
    print("   - 建立模型评估机制，定期评估模型性能")
    print("   - 提供模型版本管理，支持回滚到历史模型")
    
    print("\n" + "=" * 80)
    print("训练报告生成完成")
    print("=" * 80)

def main():
    """
    主程序
    """
    print("=" * 80)
    print("生肖预测2.0 - API数据训练")
    print("=" * 80)
    
    # 1. 加载历史数据
    print("\n1. 加载历史数据...")
    df = load_history_data('lottery_history.csv')
    if df is None:
        print("加载历史数据失败，退出程序")
        return
    
    # 2. 构建特征
    print("\n2. 构建特征...")
    X, y, feature_names = build_features(df)
    print(f"特征构建完成，特征维度: {X.shape[1]}")
    
    # 3. 数据预处理
    print("\n3. 数据预处理...")
    X_scaled, y = preprocess_data(X, y)
    print("数据预处理完成")
    
    # 4. 评估多种算法
    print("\n4. 评估多种算法...")
    results = evaluate_algorithms(X_scaled, y)
    
    # 5. 超参数调优
    print("\n5. 超参数调优...")
    best_model = hyperparameter_tuning(X_scaled, y)
    
    # 6. 特征重要性分析
    print("\n6. 特征重要性分析...")
    feature_importance = feature_importance_analysis(best_model, feature_names)
    
    # 7. 生成训练报告
    print("\n7. 生成训练报告...")
    generate_report(results, best_model, feature_importance, X_scaled, y, feature_names)
    
    # 8. 保存最佳模型
    print("\n8. 保存最佳模型...")
    model_path = 'best_zodiac_model.pkl'
    with open(model_path, 'wb') as f:
        pickle.dump(best_model, f)
    print(f"最佳模型已保存: {model_path}")


if __name__ == '__main__':
    main()
