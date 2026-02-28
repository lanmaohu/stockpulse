# 错误提示优化说明

## 新功能概述

我们为你的 StockPulse AI 添加了一套**智能、友好的错误提示系统**。

## 错误类型及提示

### 1. 股票不存在 (STOCK_NOT_FOUND)
**触发场景**: 用户输入了错误的股票代码

**提示内容**:
- 标题：未找到该股票
- 消息：您输入的股票代码可能不存在或已退市
- 建议：
  - 请检查股票代码是否正确
  - 是否包含了正确的市场后缀
  - 该股票是否仍在交易

**示例**:
```
输入：AAAA
输出：❌ 未找到 "AAAA"，请检查代码是否正确
```

---

### 2. 股票代码格式错误 (INVALID_SYMBOL)
**触发场景**: 输入了特殊字符或过长的代码

**提示内容**:
- 标题：股票代码格式错误
- 消息：请输入正确的股票代码格式
- 建议：提供正确的格式示例
  - 美股：AAPL、TSLA、MSFT
  - 港股：0700.HK、9988.HK
  - A股：000001.SZ、600000.SS

---

### 3. 网络连接失败 (NETWORK_ERROR)
**触发场景**: 用户断网或服务器不可达

**提示内容**:
- 标题：网络连接失败
- 消息：无法连接到服务器，请检查您的网络连接
- 建议：
  - 检查网络连接
  - 检查 VPN/代理设置
  - 检查防火墙设置
- 操作：显示【重试】按钮

---

### 4. 请求过于频繁 (API_RATE_LIMIT)
**触发场景**: 短时间内发送太多请求

**提示内容**:
- 标题：请求过于频繁
- 消息：您操作得太快了，请稍等片刻再试
- 建议：
  - 等待 30 秒后重试
  - 减少频繁的搜索操作
  - 如需大量查询，请联系开发者

---

### 5. 服务器错误 (SERVER_ERROR)
**触发场景**: 后端服务出错

**提示内容**:
- 标题：服务器错误
- 消息：服务器遇到了意外情况，无法完成您的请求
- 建议：
  - 刷新页面重试
  - 如果问题持续，联系技术支持

---

## 文件结构

```
src/
├── types/
│   └── error.ts           # 错误类型定义
├── utils/
│   └── errorHandler.ts    # 错误处理工具
├── components/
│   └── ErrorDisplay.tsx   # 错误显示组件
└── hooks/
    └── useStockData.ts    # 使用新的错误处理
```

## 使用方法

### 在组件中显示错误

```tsx
import { ErrorDisplay } from './components/ErrorDisplay';
import type { FriendlyError } from './types/error';

function MyComponent() {
  const [error, setError] = useState<FriendlyError | null>(null);

  return (
    <div>
      {error && (
        <ErrorDisplay 
          error={error} 
          onRetry={() => fetchData()}  // 重试按钮
          onDismiss={() => setError(null)}  // 关闭按钮
        />
      )}
    </div>
  );
}
```

### 创建错误提示

```tsx
import { createFriendlyError, ErrorType } from './types/error';

// 创建特定类型的错误
const error = createFriendlyError(ErrorType.STOCK_NOT_FOUND);

// 创建带自定义消息的错误
const error = createFriendlyError(
  ErrorType.NETWORK_ERROR, 
  '您的网络连接已断开'
);
```

### 解析未知错误

```tsx
import { parseError } from './types/error';

try {
  await fetchData();
} catch (err) {
  const friendlyError = parseError(err);
  setError(friendlyError);
}
```

## 错误提示组件特性

### ErrorDisplay（完整版）
- 彩色图标和边框
- 错误标题和详情
- 解决建议（多行格式）
- 重试按钮（如适用）
- 关闭按钮
- 错误代码（调试用）

### ErrorDisplayCompact（紧凑版）
- 用于空间有限的场景
- 一行显示核心信息
- 小型重试按钮

### ErrorToast（Toast 通知）
- 右下角弹出
- 自动消失（可扩展）
- 不影响主界面

## 颜色编码

不同错误类型使用不同颜色，帮助用户快速识别：

| 错误类型 | 颜色 | 含义 |
|---------|------|------|
| 网络错误 | 🟠 琥珀色 | 连接问题 |
| 股票不存在 | 🔵 蓝色 | 数据问题 |
| 格式错误 | 🟡 黄色 | 输入问题 |
| 频率限制 | 🟣 紫色 | 限制问题 |
| 服务器错误 | 🔴 红色 | 系统问题 |

## 测试错误提示

你可以在浏览器控制台测试不同错误：

```javascript
// 模拟股票不存在
fetch('/api/stock/NOTEXIST')

// 模拟格式错误
fetch('/api/stock/@@@')

// 模拟网络错误（断网后测试）
fetch('/api/stock/AAPL')
```

## 后续优化建议

1. **添加错误上报**：将用户遇到的错误发送到分析平台
2. **国际化**：支持英文、日文等多语言错误提示
3. **错误统计**：分析哪些错误最常见，针对性优化
4. **自动恢复**：网络错误时自动重试
