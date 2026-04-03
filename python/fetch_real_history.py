#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
获取真实的开奖历史数据
从前端API地址获取历史数据并转换为模型训练所需的格式
"""

import requests
import json
import pandas as pd
import os
from datetime import datetime

# 前端API地址
API_URL = 'https://history.macaumarksix.com/history/macaujc2/y/{year}'

# 生肖映射（从前端代码中提取）
zodiac_map = {
    '鼠': 7,
    '牛': 6,
    '虎': 5,
    '兔': 4,
    '龙': 3,
    '蛇': 2,
    '马': 1,
    '羊': 12,
    '猴': 11,
    '鸡': 10,
    '狗': 9,
    '猪': 8
}

def fetch_year_history(year):
    """获取指定年份的历史数据"""
    url = API_URL.format(year=year)
    max_retries = 3
    
    for retry in range(max_retries):
        try:
            # 添加请求头，模拟浏览器访问
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            data = response.json()
            return data
        except Exception as e:
            print(f"获取{year}年数据失败 (尝试 {retry+1}/{max_retries}): {e}")
            if retry < max_retries - 1:
                import time
                time.sleep(2)  # 等待2秒后重试
            else:
                return None

def process_data(data, year):
    """处理API返回的数据"""
    if not data or 'data' not in data:
        return []
    
    history = []
    for item in data['data']:
        expect = item.get('expect')
        opencode = item.get('openCode')  # 注意：前端使用的是openCode（大写C）
        opentime = item.get('opentime')
        
        if not expect or not opencode:
            continue
        
        # 检查期号是否属于当前年份
        expect_str = str(expect)
        if len(expect_str) < 4:
            continue
        
        # 提取年份部分
        expect_year = int(expect_str[:4])
        if expect_year != year:
            continue
        
        # 解析开奖号码
        numbers = opencode.split(',')
        if len(numbers) != 7:
            continue
        
        # 提取特码（最后一个号码）
        special_num = int(numbers[-1])
        
        # 计算特码对应的生肖
        # 生肖计算规则：(特码 - 1) % 12 + 1
        zodiac_num = (special_num - 1) % 12 + 1
        
        # 查找生肖名称
        zodiac_name = None
        for name, num in zodiac_map.items():
            if num == zodiac_num:
                zodiac_name = name
                break
        
        if not zodiac_name:
            continue
        
        # 解析期号
        try:
            full_period = int(expect)
        except ValueError:
            continue
        
        history.append({
            'period': full_period,
            'zodiac': zodiac_num,
            'zodiac_name': zodiac_name,
            'special_num': special_num,
            'opentime': opentime
        })
    
    return history

def main():
    """主函数"""
    print("开始获取真实开奖历史数据...")
    
    # 获取最近几年的数据
    current_year = datetime.now().year
    years = [current_year, current_year - 1, current_year - 2]
    
    all_history = []
    for year in years:
        print(f"获取{year}年数据...")
        data = fetch_year_history(year)
        if data:
            year_history = process_data(data, year)
            all_history.extend(year_history)
            print(f"{year}年获取到{len(year_history)}条数据")
    
    if not all_history:
        print("未获取到任何数据")
        return
    
    # 按期号排序
    all_history.sort(key=lambda x: x['period'])
    
    # 转换为DataFrame
    df = pd.DataFrame(all_history)
    
    # 只保留模型训练需要的列
    df_train = df[['period', 'zodiac']]
    
    # 保存数据
    output_path = os.path.join(os.path.dirname(__file__), '..', 'real_lottery_history.csv')
    df_train.to_csv(output_path, index=False)
    
    print(f"\n数据处理完成!")
    print(f"总数据量: {len(df)}条")
    print(f"数据保存到: {output_path}")
    print(f"期号范围: {df['period'].min()} - {df['period'].max()}")
    
    # 显示前10条数据
    print("\n前10条数据:")
    print(df.head(10))

if __name__ == '__main__':
    main()
