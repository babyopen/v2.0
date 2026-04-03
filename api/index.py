from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import requests
import json
from datetime import datetime, timedelta
import logging

# 确保可以导入python目录中的模块
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'python')))

from zodiac_ml_predictor import load_model, predict_next
import pandas as pd

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# 配置静态文件目录
app.static_folder = os.path.join(os.path.dirname(__file__), '..')
app.static_url_path = '/static'

# 配置CORS，允许跨域请求
CORS(app, origins=['*'], methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

# 全局变量存储模型
model = None

# 全局变量存储历史数据缓存
history_cache = {}
cache_expiry = {}

# 外部API配置
EXTERNAL_API = {
    'HISTORY': 'https://history.macaumarksix.com/history/macaujc2/y/'
}

# 缓存有效期（秒）
CACHE_DURATION = 3600

# 最大缓存条目数
MAX_CACHE_ITEMS = 100

def load_model_once():
    """只加载模型一次"""
    global model
    if model is None:
        try:
            # 模型文件路径
            model_path = os.path.join(os.path.dirname(__file__), '..', 'zodiac_model.pkl')
            model = load_model(model_path)
            logger.info("模型加载成功")
        except Exception as e:
            logger.error(f"模型加载失败: {str(e)}")
            model = None

def get_cached_data(key):
    """获取缓存数据"""
    if key in history_cache:
        expiry = cache_expiry.get(key, 0)
        if datetime.now().timestamp() < expiry:
            return history_cache[key]
        else:
            # 缓存过期，删除
            del history_cache[key]
            del cache_expiry[key]
    return None

def set_cached_data(key, data):
    """设置缓存数据"""
    # 检查缓存大小，如果超过限制，删除最旧的缓存
    if len(history_cache) >= MAX_CACHE_ITEMS:
        # 找出最早过期的缓存
        oldest_key = min(cache_expiry, key=cache_expiry.get)
        if oldest_key in history_cache:
            del history_cache[oldest_key]
            del cache_expiry[oldest_key]
            logger.info(f"缓存达到上限，删除最旧的缓存键: {oldest_key}")
    
    history_cache[key] = data
    cache_expiry[key] = datetime.now().timestamp() + CACHE_DURATION

@app.route('/', methods=['GET'])
def home():
    """根路由，返回前端页面"""
    try:
        index_path = os.path.join(os.path.dirname(__file__), '..', 'index.html')
        with open(index_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return content, 200, {'Content-Type': 'text/html'}
    except Exception as e:
        logger.error(f"返回前端页面失败: {str(e)}")
        return jsonify({
            'status': 'error',
            'code': 'INTERNAL_ERROR',
            'message': f'返回前端页面失败: {str(e)}'
        }), 500

@app.route('/style.css', methods=['GET'])
def style_css():
    """返回样式文件"""
    try:
        style_path = os.path.join(os.path.dirname(__file__), '..', 'style.css')
        with open(style_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return content, 200, {'Content-Type': 'text/css'}
    except Exception as e:
        logger.error(f"返回样式文件失败: {str(e)}")
        return jsonify({
            'status': 'error',
            'code': 'INTERNAL_ERROR',
            'message': f'返回样式文件失败: {str(e)}'
        }), 500

@app.route('/api/health', methods=['GET'])
def health():
    """健康检查端点"""
    return jsonify({'status': 'ok', 'message': 'API is running'})

@app.route('/api/predict', methods=['POST'])
def predict():
    """预测下一期生肖"""
    try:
        # 加载模型
        load_model_once()
        if model is None:
            return jsonify({'error': '模型加载失败'}), 500
        
        # 读取历史数据
        data_path = os.path.join(os.path.dirname(__file__), '..', 'lottery_history.csv')
        df = pd.read_csv(data_path)
        
        # 预测下一期
        if len(df) == 0:
            return jsonify({'error': '历史数据为空'}), 400
        
        last_row = df.iloc[-1]
        predictions = predict_next(model, last_row, df)
        
        # 生肖映射
        zodiac_map = {
            1: '马', 2: '蛇', 3: '龙', 4: '兔', 5: '虎', 6: '牛',
            7: '鼠', 8: '猪', 9: '狗', 10: '鸡', 11: '猴', 12: '羊'
        }
        
        # 格式化结果
        results = []
        for i, prob in enumerate(predictions):
            zodiac_num = i + 1
            results.append({
                'name': zodiac_map.get(zodiac_num, f'未知{zodiac_num}'),
                'number': zodiac_num,
                'probability': float(prob)
            })
        
        # 按概率排序
        results.sort(key=lambda x: x['probability'], reverse=True)
        
        return jsonify({
            'status': 'success',
            'predictions': results,
            'top3': results[:3],
            'recommendation': results[0] if results else None
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/zodiac-mapping', methods=['GET'])
def zodiac_mapping():
    """生肖映射表"""
    zodiac_map = {
        1: '马', 2: '蛇', 3: '龙', 4: '兔', 5: '虎', 6: '牛',
        7: '鼠', 8: '猪', 9: '狗', 10: '鸡', 11: '猴', 12: '羊'
    }
    return jsonify({'zodiacs': zodiac_map})

@app.route('/api/lottery/latest', methods=['GET'])
def get_latest_lottery():
    """获取最新开奖记录"""
    try:
        year = datetime.now().year
        cache_key = f'latest_{year}'
        
        # 尝试从缓存获取
        cached_data = get_cached_data(cache_key)
        if cached_data:
            return jsonify({
                'status': 'success',
                'data': cached_data
            })
        
        # 从外部API获取数据
        url = f"{EXTERNAL_API['HISTORY']}{year}"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        raw_data = data.get('data', [])
        
        # 过滤无效数据
        filtered_data = []
        for item in raw_data:
            if not item.get('expect') or not item.get('openCode'):
                continue
            
            # 验证开奖号码格式
            open_code = item['openCode']
            numbers = open_code.split(',')
            if len(numbers) != 7:
                continue
            
            # 验证每个号码都是有效的数字
            valid = True
            for num in numbers:
                if not num.isdigit() or int(num) < 1 or int(num) > 49:
                    valid = False
                    break
            
            if valid:
                filtered_data.append(item)
        
        # 去重并按期号降序排序
        unique_map = {}
        for item in filtered_data:
            try:
                expect_num = int(item['expect'])
                unique_map[expect_num] = item
            except ValueError:
                continue
        
        sorted_data = sorted(unique_map.values(), 
                           key=lambda x: int(x['expect']), 
                           reverse=True)
        
        # 缓存数据
        set_cached_data(cache_key, sorted_data[:20])  # 只缓存最近20条
        
        return jsonify({
            'status': 'success',
            'data': sorted_data[:20]
        })
        
    except requests.RequestException as e:
        logger.error(f"外部API调用失败: {str(e)}")
        return jsonify({
            'status': 'error',
            'code': 'API_ERROR',
            'message': f'外部API调用失败: {str(e)}'
        }), 500
    except ValueError as e:
        logger.error(f"数据格式错误: {str(e)}")
        return jsonify({
            'status': 'error',
            'code': 'DATA_ERROR',
            'message': f'数据格式错误: {str(e)}'
        }), 400
    except Exception as e:
        logger.error(f"处理数据失败: {str(e)}")
        return jsonify({
            'status': 'error',
            'code': 'INTERNAL_ERROR',
            'message': f'处理数据失败: {str(e)}'
        }), 500

@app.route('/api/lottery/history', methods=['GET'])
def get_lottery_history():
    """获取历史开奖记录"""
    try:
        year = request.args.get('year', str(datetime.now().year))
        cache_key = f'history_{year}'
        
        # 尝试从缓存获取
        cached_data = get_cached_data(cache_key)
        if cached_data:
            return jsonify({
                'status': 'success',
                'data': cached_data
            })
        
        # 从外部API获取数据
        url = f"{EXTERNAL_API['HISTORY']}{year}"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        raw_data = data.get('data', [])
        
        # 过滤无效数据
        filtered_data = []
        for item in raw_data:
            if not item.get('expect') or not item.get('openCode'):
                continue
            
            # 验证开奖号码格式
            open_code = item['openCode']
            numbers = open_code.split(',')
            if len(numbers) != 7:
                continue
            
            # 验证每个号码都是有效的数字
            valid = True
            for num in numbers:
                if not num.isdigit() or int(num) < 1 or int(num) > 49:
                    valid = False
                    break
            
            if valid:
                filtered_data.append(item)
        
        # 去重并按期号降序排序
        unique_map = {}
        for item in filtered_data:
            try:
                expect_num = int(item['expect'])
                unique_map[expect_num] = item
            except ValueError:
                continue
        
        sorted_data = sorted(unique_map.values(), 
                           key=lambda x: int(x['expect']), 
                           reverse=True)
        
        # 缓存数据
        set_cached_data(cache_key, sorted_data)
        
        return jsonify({
            'status': 'success',
            'data': sorted_data
        })
        
    except requests.RequestException as e:
        logger.error(f"外部API调用失败: {str(e)}")
        return jsonify({
            'status': 'error',
            'code': 'API_ERROR',
            'message': f'外部API调用失败: {str(e)}'
        }), 500
    except ValueError as e:
        logger.error(f"数据格式错误: {str(e)}")
        return jsonify({
            'status': 'error',
            'code': 'DATA_ERROR',
            'message': f'数据格式错误: {str(e)}'
        }), 400
    except Exception as e:
        logger.error(f"处理数据失败: {str(e)}")
        return jsonify({
            'status': 'error',
            'code': 'INTERNAL_ERROR',
            'message': f'处理数据失败: {str(e)}'
        }), 500

@app.route('/api/lottery/zodiac', methods=['GET'])
def get_zodiac_history():
    """获取生肖开奖记录（用于模型训练）"""
    try:
        # 读取本地CSV文件
        data_path = os.path.join(os.path.dirname(__file__), '..', 'lottery_history.csv')
        df = pd.read_csv(data_path)
        
        # 转换为JSON格式
        history_data = []
        for _, row in df.iterrows():
            history_data.append({
                'period': int(row['period']),
                'zodiac': int(row['zodiac'])
            })
        
        return jsonify({
            'status': 'success',
            'data': history_data
        })
        
    except FileNotFoundError as e:
        logger.error(f"文件不存在: {str(e)}")
        return jsonify({
            'status': 'error',
            'code': 'FILE_ERROR',
            'message': f'文件不存在: {str(e)}'
        }), 404
    except pd.errors.EmptyDataError as e:
        logger.error(f"文件为空: {str(e)}")
        return jsonify({
            'status': 'error',
            'code': 'DATA_ERROR',
            'message': f'文件为空: {str(e)}'
        }), 400
    except Exception as e:
        logger.error(f"读取生肖历史数据失败: {str(e)}")
        return jsonify({
            'status': 'error',
            'code': 'INTERNAL_ERROR',
            'message': f'读取生肖历史数据失败: {str(e)}'
        }), 500

@app.route('/api/cache/clear', methods=['POST'])
def clear_cache():
    """清空所有缓存"""
    try:
        global history_cache, cache_expiry
        history_cache.clear()
        cache_expiry.clear()
        logger.info("缓存已清空")
        return jsonify({
            'status': 'success',
            'message': '缓存已清空'
        })
    except Exception as e:
        logger.error(f"清空缓存失败: {str(e)}")
        return jsonify({
            'status': 'error',
            'code': 'INTERNAL_ERROR',
            'message': f'清空缓存失败: {str(e)}'
        }), 500

# Vercel 要求的入口点
if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=3000)

# 明确导出 app 变量，供 Vercel 使用
handler = app
