from flask import Flask, request, jsonify
import sys
import os
import time

# 确保可以导入python目录中的模块
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'python')))

from zodiac_ml_predictor import load_model, predict_next
import pandas as pd

app = Flask(__name__)

# 常量定义
ZODIAC_MAP = {
    1: '马', 2: '蛇', 3: '龙', 4: '兔', 5: '虎', 6: '牛',
    7: '鼠', 8: '猪', 9: '狗', 10: '鸡', 11: '猴', 12: '羊'
}

# 全局变量
model = None
cached_data = None
cached_data_time = 0
DATA_CACHE_TTL = 60  # 数据缓存时间（秒）

def load_model_once():
    """只加载模型一次"""
    global model
    if model is None:
        try:
            # 模型文件路径
            model_path = os.path.join(os.path.dirname(__file__), '..', 'zodiac_model.pkl')
            model = load_model(model_path)
            print("模型加载成功")
        except Exception as e:
            print(f"模型加载失败: {str(e)}")
            model = None

def get_history_data():
    """获取历史数据，带缓存机制"""
    global cached_data, cached_data_time
    current_time = time.time()
    
    # 检查缓存是否有效
    if cached_data is not None and (current_time - cached_data_time) < DATA_CACHE_TTL:
        return cached_data
    
    # 读取历史数据
    data_path = os.path.join(os.path.dirname(__file__), '..', 'lottery_history.csv')
    try:
        df = pd.read_csv(data_path)
        # 更新缓存
        cached_data = df
        cached_data_time = current_time
        return df
    except Exception as e:
        print(f"读取历史数据失败: {str(e)}")
        return None

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
        
        # 获取请求数据
        data = request.get_json()
        
        # 优先使用前端传递的历史数据
        if data and 'history' in data and data['history']:
            # 处理前端传递的历史数据
            history_data = data['history']
            
            # 转换数据格式
            periods = []
            zodiacs = []
            
            for item in history_data:
                if 'period' in item and 'zodiac' in item:
                    # 处理前端传递的生肖名称，转换为数字
                    zodiac_name = item['zodiac']
                    # 反向映射：生肖名称到数字
                    zodiac_num = None
                    for num, name in ZODIAC_MAP.items():
                        if name == zodiac_name:
                            zodiac_num = num
                            break
                    
                    if zodiac_num:
                        periods.append(item['period'])
                        zodiacs.append(zodiac_num)
            
            # 创建DataFrame
            if periods and zodiacs:
                df = pd.DataFrame({'period': periods, 'zodiac': zodiacs})
                # 按期号排序
                df = df.sort_values('period').reset_index(drop=True)
                print(f"使用前端传递的历史数据: {len(df)} 条记录")
            else:
                # 前端数据无效，使用本地数据
                df = get_history_data()
                if df is None:
                    return jsonify({'error': '无法读取历史数据'}), 500
        else:
            # 没有前端数据，使用本地数据
            df = get_history_data()
            if df is None:
                return jsonify({'error': '无法读取历史数据'}), 500
        
        # 预测下一期
        if len(df) == 0:
            return jsonify({'error': '历史数据为空'}), 400
        
        # 检查数据量是否足够
        if len(df) < 50:
            # 数据量不足，使用本地数据作为补充
            local_df = get_history_data()
            if local_df is not None and len(local_df) > len(df):
                df = local_df
                print(f"数据量不足，使用本地数据: {len(df)} 条记录")
        
        last_row = df.iloc[-1]
        predictions = predict_next(model, last_row, df)
        
        # 生肖元素和颜色映射
        zodiac_element_map = {
            1: '火', 2: '火', 3: '土', 4: '木', 5: '木', 6: '土',
            7: '水', 8: '水', 9: '土', 10: '金', 11: '金', 12: '土'
        }
        
        zodiac_color_map = {
            1: '红', 2: '红', 3: '绿', 4: '绿', 5: '绿', 6: '蓝',
            7: '蓝', 8: '蓝', 9: '红', 10: '红', 11: '红', 12: '绿'
        }
        
        # 格式化结果
        results = []
        for i, prob in enumerate(predictions):
            zodiac_num = i + 1
            results.append({
                'name': ZODIAC_MAP.get(zodiac_num, f'未知{zodiac_num}'),
                'number': zodiac_num,
                'probability': float(prob),
                'element': zodiac_element_map.get(zodiac_num, ''),
                'color': zodiac_color_map.get(zodiac_num, '')
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
        print(f"预测失败: {str(e)}")
        return jsonify({'error': '预测过程中发生错误'}), 500

@app.route('/api/zodiac-mapping', methods=['GET'])
def zodiac_mapping():
    """生肖映射表"""
    return jsonify({'zodiacs': ZODIAC_MAP})

# 缓存前端文件内容
cached_frontend_files = {}

@app.route('/', methods=['GET'])
def index():
    """根路径，返回前端页面"""
    try:
        # 检查缓存
        if 'index.html' in cached_frontend_files:
            return cached_frontend_files['index.html']
        
        # 读取前端index.html文件
        html_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'index.html')
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # 缓存文件内容
        cached_frontend_files['index.html'] = html_content
        return html_content
    except Exception as e:
        print(f"读取前端文件失败: {str(e)}")
        return jsonify({'error': '无法加载前端页面'}), 500

@app.route('/style.css', methods=['GET'])
def style_css():
    """返回前端样式文件"""
    try:
        # 检查缓存
        if 'style.css' in cached_frontend_files:
            return cached_frontend_files['style.css']
        
        # 读取前端style.css文件
        css_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'style.css')
        with open(css_path, 'r', encoding='utf-8') as f:
            css_content = f.read()
        
        # 缓存文件内容
        cached_frontend_files['style.css'] = (css_content, 200, {'Content-Type': 'text/css'})
        return css_content, 200, {'Content-Type': 'text/css'}
    except Exception as e:
        print(f"读取样式文件失败: {str(e)}")
        return jsonify({'error': '无法加载样式文件'}), 500

# 应用入口点
if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=8000)
