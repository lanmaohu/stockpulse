/**
 * Stock Analysis API 测试脚本
 * 测试 Apple (AAPL) 财务数据抓取
 * 
 * 运行: node test-stockanalysis.js
 */

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

const log = {
  info: (msg) => console.log(colors.blue + msg + colors.reset),
  success: (msg) => console.log(colors.green + msg + colors.reset),
  error: (msg) => console.log(colors.red + msg + colors.reset),
  warn: (msg) => console.log(colors.yellow + msg + colors.reset),
};

// 解析财务数值
function parseValue(value) {
  if (!value) return 0;
  const clean = value.replace(/,/g, '').replace(/\s/g, '');
  const isNegative = clean.startsWith('(') || clean.startsWith('-');
  const match = clean.match(/([\d.]+)([BMK]?)/i);
  if (!match) return 0;
  
  let num = parseFloat(match[1]);
  const suffix = match[2].toUpperCase();
  
  switch (suffix) {
    case 'B': num *= 1000; break;
    case 'M': break;
    case 'K': num *= 0.001; break;
  }
  
  return isNegative ? -num : num;
}

// 解析股本
function parseShares(value) {
  if (!value) return 0;
  const clean = value.replace(/,/g, '').replace(/\s/g, '');
  const match = clean.match(/([\d.]+)([BMK]?)/i);
  if (!match) return 0;
  
  let num = parseFloat(match[1]);
  const suffix = match[2].toUpperCase();
  
  switch (suffix) {
    case 'B': return num * 1000;
    case 'M': return num;
    case 'K': return num * 0.001;
    default: return num;
  }
}

// 从 HTML 提取财务数据
function extractFinancialData(html) {
  // 移除 script 和 style 标签
  const cleanHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  
  const data = {};
  
  // 提取所有行
  const rows = cleanHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  
  for (const row of rows) {
    const text = row.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Free Cash Flow (不包含 Per Share 或 Margin)
    if (text.includes('Free Cash Flow') && 
        !text.includes('Per Share') && 
        !text.includes('Margin') &&
        !data.fcf) {
      const match = text.match(/(\d{2,3},\d{3})/);
      if (match) data.fcf = match[1];
    }
    
    // Cash & Equivalents
    if ((text.includes('Cash & Equivalents') || text.includes('Cash &amp; Equivalents')) && 
        !data.cash) {
      const match = text.match(/(\d{2,3},\d{3})/);
      if (match) data.cash = match[1];
    }
    
    // Total Debt
    if (text.includes('Total Debt') && 
        !text.includes('Total Debt to') &&
        !data.debt) {
      const match = text.match(/(\d{2,3},\d{3})/);
      if (match) data.debt = match[1];
    }
    
    // Shares Outstanding
    if (text.toLowerCase().includes('shares outstanding') && 
        !text.toLowerCase().includes('growth') &&
        !data.shares) {
      const match = text.match(/(\d{2,3},?\d*)\s*(M|B|K)?/i);
      if (match) data.shares = match[1] + (match[2] || '');
    }
  }
  
  return data;
}

// 测试 Apple 数据抓取
async function testAppleFinancials() {
  log.info('🧪 测试 Stock Analysis API - Apple (AAPL)');
  console.log('=' .repeat(60));
  
  const symbol = 'AAPL';
  const saSymbol = symbol.toLowerCase();
  
  try {
    // 获取利润表
    log.info('\n📊 步骤1: 获取利润表...');
    const incomeUrl = `https://stockanalysis.com/stocks/${saSymbol}/financials/`;
    const incomeRes = await fetch(incomeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
    });
    
    if (!incomeRes.ok) {
      throw new Error(`HTTP ${incomeRes.status}`);
    }
    
    const incomeHtml = await incomeRes.text();
    log.success('✅ 利润表获取成功');
    
    // 获取资产负债表
    log.info('\n📊 步骤2: 获取资产负债表...');
    const balanceUrl = `https://stockanalysis.com/stocks/${saSymbol}/financials/balance-sheet/`;
    const balanceRes = await fetch(balanceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
    });
    
    const balanceHtml = balanceRes.ok ? await balanceRes.text() : '';
    log.success(balanceRes.ok ? '✅ 资产负债表获取成功' : '⚠️ 资产负债表获取失败');
    
    // 提取数据
    log.info('\n📋 步骤3: 提取财务数据...');
    const incomeData = extractFinancialData(incomeHtml);
    const balanceData = extractFinancialData(balanceHtml);
    
    // 合并数据（优先使用资产负债表的数据）
    const fcf = incomeData.fcf;
    const cash = balanceData.cash || incomeData.cash;
    const debt = balanceData.debt || incomeData.debt;
    const shares = balanceData.shares || incomeData.shares;
    
    log.info('\n📈 提取结果:');
    console.log(`  Free Cash Flow: ${fcf || '❌ 未找到'}`);
    console.log(`  Cash & Equivalents: ${cash || '❌ 未找到'}`);
    console.log(`  Total Debt: ${debt || '❌ 未找到'}`);
    console.log(`  Shares Outstanding: ${shares || '❌ 未找到'}`);
    
    // 解析数值
    log.info('\n🔢 步骤4: 解析数值...');
    const fcfValue = parseValue(fcf);
    const cashValue = parseValue(cash);
    const debtValue = parseValue(debt);
    const sharesValue = parseShares(shares);
    
    console.log(`  FCF (百万美元): ${fcfValue ? fcfValue.toLocaleString() : '❌'}`);
    console.log(`  Cash (百万美元): ${cashValue ? cashValue.toLocaleString() : '❌'}`);
    console.log(`  Debt (百万美元): ${debtValue ? debtValue.toLocaleString() : '❌'}`);
    console.log(`  Shares (百万股): ${sharesValue ? sharesValue.toLocaleString() : '❌'}`);
    
    // 断言验证
    log.info('\n✅ 断言验证:');
    let passed = 0;
    let failed = 0;
    
    // 验证 FCF (Apple 2024 FCF 约 123,324 百万美元)
    if (fcfValue > 100000 && fcfValue < 150000) {
      log.success(`  ✓ FCF 在预期范围内: ${fcfValue.toLocaleString()} 百万美元`);
      passed++;
    } else {
      log.error(`  ✗ FCF 不在预期范围内: ${fcfValue} (预期: 100000-150000)`);
      failed++;
    }
    
    // 验证 Cash (Apple 现金约 45,000-50,000 百万美元)
    if (cashValue > 40000 && cashValue < 70000) {
      log.success(`  ✓ Cash 在预期范围内: ${cashValue.toLocaleString()} 百万美元`);
      passed++;
    } else {
      log.error(`  ✗ Cash 不在预期范围内: ${cashValue} (预期: 40000-70000)`);
      failed++;
    }
    
    // 验证 Debt (Apple 负债约 90,000-120,000 百万美元)
    if (debtValue > 80000 && debtValue < 150000) {
      log.success(`  ✓ Debt 在预期范围内: ${debtValue.toLocaleString()} 百万美元`);
      passed++;
    } else {
      log.error(`  ✗ Debt 不在预期范围内: ${debtValue} (预期: 80000-150000)`);
      failed++;
    }
    
    // 验证 Shares (Apple 股本约 14,000-16,000 百万股)
    if (sharesValue > 14000 && sharesValue < 17000) {
      log.success(`  ✓ Shares 在预期范围内: ${sharesValue.toLocaleString()} 百万股`);
      passed++;
    } else {
      log.error(`  ✗ Shares 不在预期范围内: ${sharesValue} (预期: 14000-17000)`);
      failed++;
    }
    
    // 测试总结
    console.log('\n' + '='.repeat(60));
    log.info('📝 测试结果:');
    console.log(`  通过: ${passed}`);
    console.log(`  失败: ${failed}`);
    console.log(`  总计: ${passed + failed}`);
    
    if (failed === 0) {
      log.success('\n🎉 所有测试通过!');
      process.exit(0);
    } else {
      log.warn('\n⚠️ 部分测试失败');
      process.exit(1);
    }
    
  } catch (error) {
    log.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
testAppleFinancials();
