#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生肖预测2.0 - ML模型API服务
为前端提供机器学习预测接口
生肖ID映射与项目内保持一致
"""

import json
import numpy as np
from http.server import HTTPServer, BaseHTTPRequestHandler
import pickle
import os

# ============================================
# 生肖配置 - 与项目内 CONFIG.ANALYSIS.ZODIAC_ALL 保持一致
# 顺序: 鼠、牛、虎、兔、龙、蛇、马、羊、猴、鸡、狗、猪
# ID:   1   2   3   4   5   6   7   8   9   10  11  12
# ============================================
ZODIAC_ALL = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"]

ZODIAC_CONFIG = {
    # ID到名称的映射
    'id_to_name': {i+1: name for i, name in enumerate(ZODIAC_ALL)},
    
    # 生肖到五行的映射
    'zodiac_to_element': {
        '鼠': '水', '牛': '土', '虎': '木', '兔': '木',
        '龙': '土', '蛇': '火', '马': '火', '羊': '土',
        '猴': '金', '鸡': '金', '狗': '土', '猪': '水'
    },
    
    # 生肖到波色的映射
    'zodiac_to_color': {
        '鼠': '红', '牛': '绿', '虎': '蓝', '兔': '绿',
        '龙': '红', '蛇': '红', '马': '红', '羊': '绿',
        '猴': '蓝', '鸡': '红', '狗': '绿', '猪': '蓝'
    }
}

# 五行相生关系
ELEMENT_GENERATE = {
    '金': '水', '水': '木', '木': '火', '火': '土', '土': '金'
}

# 五行相克关系
ELEMENT_OVERCOME = {
    '金': '木', '木': '土', '土': '水', '水': '火', '火': '金'
}


def get_element_relation(element1, element2):
    """
    获取两个五行元素之间的关系
    返回: 0=相克, 1=相同, 2=相生
    """
    if element1 == element2:
        return 1  # 相同
    elif ELEMENT_GENERATE.get(element1) == element2:
        return 2  # 相生
    else:
        return 0  # 相克


class MLPredictor:
    """ML预测器"""
    def __init__(self):
        self.model = None
        self.load_model()
    
    def load_model(self):
        """加载训练好的模型"""
        model_path = 'zodiac_model.pkl'
        if os.path.exists(model_path):
            with open(model_path, 'rb') as f:
                self.model = pickle.load(f)
            print(f"模型加载成功: {model_path}")
        else:
            print(f"模型文件不存在: {model_path}")
    
    def predict(self, history_data):
        """
        预测下一期生肖概率
        
        Args:
            history_data: 历史开奖数据列表 [{period, zodiac}, ...]
                         zodiac为生肖名称(字符串)或ID(1-12)
        
        Returns:
            dict: 包含预测结果的字典
        """
        if self.model is None:
            return {"error": "模型未加载"}
        
        if len(history_data) < 50:
            return {"error": "历史数据不足，需要至少50期"}
        
        # 构建特征
        features = self._build_features(history_data)
        
        # 预测概率
        probabilities = self.model.predict_proba([features])[0]
        
        # 排序结果 - 使用项目内的生肖顺序
        results = []
        for i in range(12):
            zodiac_id = i + 1
            zodiac_name = ZODIAC_CONFIG['id_to_name'][zodiac_id]
            results.append({
                "id": zodiac_id,
                "name": zodiac_name,
                "element": ZODIAC_CONFIG['zodiac_to_element'][zodiac_name],
                "color": ZODIAC_CONFIG['zodiac_to_color'][zodiac_name],
                "probability": round(float(probabilities[i]), 4)
            })
        
        # 按概率排序
        results.sort(key=lambda x: x['probability'], reverse=True)
        
        return {
            "success": True,
            "predictions": results,
            "top3": results[:3],
            "recommendation": results[0]
        }
    
    def _build_features(self, history_data):
        """
        构建特征向量
        与项目内的特征工程保持一致
        """
        n_zodiacs = 12
        features = []
        
        # 转换数据格式 - 统一转为生肖名称
        zodiacs = []
        for item in history_data:
            z = item['zodiac']
            if isinstance(z, int) and 1 <= z <= 12:
                zodiacs.append(ZODIAC_CONFIG['id_to_name'][z])
            elif isinstance(z, str) and z in ZODIAC_ALL:
                zodiacs.append(z)
            else:
                zodiacs.append(ZODIAC_ALL[0])  # 默认鼠
        
        # 基础统计特征
        miss_counts = {z: 0 for z in ZODIAC_ALL}
        max_miss = {z: 0 for z in ZODIAC_ALL}
        
        # 计算遗漏
        for z in ZODIAC_ALL:
            last_appear = -1
            for i, zod in enumerate(zodiacs):
                if zod == z:
                    last_appear = i
            if last_appear == -1:
                miss_counts[z] = len(zodiacs)
            else:
                miss_counts[z] = len(zodiacs) - last_appear - 1
        
        # 计算最大遗漏
        for z in ZODIAC_ALL:
            current_miss = 0
            for zod in zodiacs:
                if zod == z:
                    max_miss[z] = max(max_miss[z], current_miss)
                    current_miss = 0
                else:
                    current_miss += 1
        
        # 近N期统计
        recent_10 = zodiacs[-10:]
        recent_20 = zodiacs[-20:]
        recent_50 = zodiacs[-50:]
        
        # 计算排名
        from collections import Counter
        counts_20 = Counter(recent_20)
        ranks = {}
        for z in ZODIAC_ALL:
            count = counts_20.get(z, 0)
            rank = 1
            for other_z in ZODIAC_ALL:
                if counts_20.get(other_z, 0) > count:
                    rank += 1
            ranks[z] = rank
        
        # 计算连开次数
        consecutive = {z: 0 for z in ZODIAC_ALL}
        break_state = {z: 0 for z in ZODIAC_ALL}
        
        for z in ZODIAC_ALL:
            cons = 0
            for i in range(len(zodiacs) - 1, -1, -1):
                if zodiacs[i] == z:
                    cons += 1
                else:
                    break
            consecutive[z] = cons
            
            if len(zodiacs) >= 2:
                last = zodiacs[-1]
                second_last = zodiacs[-2]
                break_state[z] = 1 if (last == z and second_last != z) else 0
        
        # 添加基础统计特征 - 按项目内生肖顺序
        for z in ZODIAC_ALL:
            miss = miss_counts[z]
            max_m = max_miss[z] if max_miss[z] > 0 else 1
            
            features.extend([
                miss,
                miss / max_m,
                recent_10.count(z),
                recent_20.count(z),
                recent_50.count(z),
                recent_10.count(z) / 10,
                recent_20.count(z) / 20,
                ranks[z],
                consecutive[z],
                break_state[z],
            ])
        
        # 动态特征
        prev_zodiac = zodiacs[-1]
        prev_zodiac_id = ZODIAC_ALL.index(prev_zodiac) + 1
        features.append(prev_zodiac_id)
        features.append(0)
        features.append(1)
        features.extend([0, 0, 0, 0, 0, 0])
        
        # 时序特征
        for z in ZODIAC_ALL:
            appear_indices = [i for i, zod in enumerate(zodiacs) if zod == z]
            
            if len(appear_indices) >= 2:
                intervals = [appear_indices[i] - appear_indices[i-1] 
                           for i in range(1, len(appear_indices))]
                interval_mean = np.mean(intervals[-5:])
                interval_std = np.std(intervals[-5:]) if len(intervals) >= 5 else 0
            else:
                interval_mean = 0
                interval_std = 0
            
            features.extend([interval_mean, interval_std, 0])
        
        return features


# 全局预测器实例
predictor = MLPredictor()


class APIHandler(BaseHTTPRequestHandler):
    """API请求处理器"""
    
    def _set_headers(self, content_type='application/json'):
        """设置响应头"""
        self.send_response(200)
        self.send_header('Content-type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_OPTIONS(self):
        """处理OPTIONS请求（CORS预检）"""
        self._set_headers()
    
    def do_GET(self):
        """处理GET请求"""
        if self.path == '/api/health':
            self._set_headers()
            response = {"status": "ok", "model_loaded": predictor.model is not None}
            self.wfile.write(json.dumps(response).encode())
        
        elif self.path == '/api/zodiac-mapping':
            self._set_headers()
            response = {
                "success": True, 
                "mapping": ZODIAC_CONFIG['id_to_name'],
                "order": ZODIAC_ALL
            }
            self.wfile.write(json.dumps(response).encode())
        
        else:
            self._set_headers()
            response = {"error": "未知的API端点"}
            self.wfile.write(json.dumps(response).encode())
    
    def do_POST(self):
        """处理POST请求"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
        except json.JSONDecodeError:
            self._set_headers()
            response = {"error": "无效的JSON数据"}
            self.wfile.write(json.dumps(response).encode())
            return
        
        if self.path == '/api/predict':
            # 预测接口
            history_data = data.get('history', [])
            result = predictor.predict(history_data)
            
            self._set_headers()
            self.wfile.write(json.dumps(result).encode())
        
        else:
            self._set_headers()
            response = {"error": "未知的API端点"}
            self.wfile.write(json.dumps(response).encode())
    
    def log_message(self, format, *args):
        """自定义日志输出"""
        print(f"[API] {self.address_string()} - {format % args}")


def run_server(port=5001):
    """运行API服务器"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, APIHandler)
    print(f"=" * 60)
    print(f"生肖预测2.0 - ML模型API服务")
    print(f"=" * 60)
    print(f"服务地址: http://localhost:{port}")
    print(f"生肖顺序: {' '.join(ZODIAC_ALL)}")
    print(f"API端点:")
    print(f"  GET  /api/health          - 健康检查")
    print(f"  GET  /api/zodiac-mapping  - 生肖映射")
    print(f"  POST /api/predict         - 预测接口")
    print(f"=" * 60)
    print(f"按 Ctrl+C 停止服务")
    print(f"=" * 60)
    httpd.serve_forever()


if __name__ == '__main__':
    run_server()
