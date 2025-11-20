# 画布缩放功能增强

## 修改说明

对 `checkAndExpandCanvas` 和 `checkAndExpandCanvasWhileDragging` 方法进行了增强，现在它们不仅支持画布扩展，还支持画布收缩功能。

## 主要改进

### 1. 收缩检测逻辑
- 添加了收缩检测阈值 (`contractThreshold = 100px`)
- 当鼠标或区域块远离边缘超过此阈值时，触发收缩检查

### 2. 智能收缩算法
- **右边缘收缩**: 检测所有区域块的最右边缘，如果距离画布右边缘有足够空间，则收缩画布宽度
- **下边缘收缩**: 检测所有区域块的最下边缘，如果距离画布下边缘有足够空间，则收缩画布高度

### 3. 安全限制
- 设置最小画布尺寸限制 (宽度 ≥ 800px, 高度 ≥ 600px)
- 确保收缩操作不会导致画布过小

### 4. 实时更新
- 在拖拽过程中实时检测收缩需求
- 拖拽结束时进行最终收缩检查

## 代码变化

### 变量名更新
- `needExpand` → `needResize` (现在同时处理扩展和收缩)
- 添加了 `contractThreshold` 收缩阈值变量

### 新增收缩逻辑
```javascript
// 检查右边缘 - 收缩
if (e.clientX < rect.right - contractThreshold) {
    // 获取所有区域块的最右边缘
    const allBlocks = audienceSection.querySelectorAll('.audience-block');
    let maxRight = 0;
    allBlocks.forEach(block => {
        const blockRect = block.getBoundingClientRect();
        maxRight = Math.max(maxRight, blockRect.right);
    });
    
    // 如果最右区域距离右边缘有足够的空间，可以收缩
    if (maxRight < rect.right - contractThreshold && newWidth > 800) {
        newWidth = Math.max(800, maxRight - rect.left + 50);
        needResize = true;
    }
}
```

## 测试文件

创建了 `test_canvas_resize.html` 测试文件，可以：
- 添加可拖拽的测试区域
- 实时观察画布尺寸变化
- 验证扩展和收缩功能

## 使用方法

1. 添加几个区域块到画布中
2. 将区域块拖拽到画布边缘附近 - 画布会自动扩展
3. 将区域块远离画布边缘 - 当有足够空间时，画布会自动收缩
4. 画布尺寸会实时更新并显示在右上角的信息面板中