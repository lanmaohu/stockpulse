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

// 解析财务数值（单位：百万）
function parseValue(value) {
  if (!value) return 0;
  const clean = value.replace(/,/g, '').replace(/\s/g, '');
  const isNegative = clean.startsWith('(') || clean.startsWith('-');
  const match = clean.match(/([\d.]+)([BMK]?)/i);
  if (!match) return 0;
  
  let num = parseFloat(match[1]);
  const suffix = match[2].toUpperCase();
  
  switch (suffix) {
    case 'B': num *= 1000; break;  // Billion -> Million
    case 'M': break;               // Million
    case 'K': num *= 0.001; break; // Thousand -> Million
  }
  
  return isNegative ? -num : num;
}

// 解析股本（单位：百万股）
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

// 从 HTML 提取行数据
function extractRowValue(html, labelPatterns) {
  const cleanHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const rows = cleanHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  
  for (const row of rows) {
    const text = row.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    for (const pattern of labelPatterns) {
      if (text.toLowerCase().includes(pattern.toLowerCase())) {
        if (text.includes('Growth') || text.includes('Per Share') || 
            text.includes('Margin') || text.includes('Ratio')) {
          continue;
        }
        
        const match = text.match(/(\d{1,3},\d{3})/);
        if (match) return match[1];
      }
    }
  }
  
  return '';
}

// 测试 Apple 数据抓取
async function testAppleFinancials() {
  log.info('🧪 测试 Stock Analysis API - Apple (AAPL)');
  console.log('=' .repeat(70));
  
  const symbol = 'AAPL';
  const saSymbol = symbol.toLowerCase();
  
  try {
    // 1. 获取首页股价
    log.info('\n📊 步骤1: 获取首页股价...');
    const overviewUrl = `https://stockanalysis.com/stocks/${saSymbol}/`;
    const overviewRes = await fetch(overviewUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    let currentPrice = 0;
    let companyName = symbol;
    
    if (overviewRes.ok) {
      const overviewHtml = await overviewRes.text();
      
      const priceMatch = overviewHtml.match(/NASDAQ[^\d]{0,200}(\d{3,4}\.\d{2})/) ||
                         overviewHtml.match(/>(\d{3,4}\.\d{2})<\/div>/);
      if (priceMatch) {
        currentPrice = parseFloat(priceMatch[1]);
      }
      
      const nameMatch = overviewHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (nameMatch) {
        companyName = nameMatch[1].trim();
      }
      
      log.success(`  ✅ 股价: $${currentPrice}`);
      log.success(`  ✅ 公司名称: ${companyName}`);
    }
    
    // 2. 获取 Cash Flow 页面的 Free Cash Flow
    log.info('\n📊 步骤2: 从 Cash Flow 页面获取 Free Cash Flow...');
    const cashFlowUrl = `https://stockanalysis.com/stocks/${saSymbol}/financials/cash-flow-statement/`;
    const cashFlowRes = await fetch(cashFlowUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    let fcfValue = '';
    if (cashFlowRes.ok) {
      const cashFlowHtml = await cashFlowRes.text();
      fcfValue = extractRowValue(cashFlowHtml, ['Free Cash Flow']);
      log.success(`  ✅ Free Cash Flow: ${fcfValue} 百万美元`);
    } else {
      log.error(`  ❌ 获取失败: HTTP ${cashFlowRes.status}`);
    }
    
    // 3. 获取 Balance Sheet 页面数据
    log.info('\n📊 步骤3: 从 Balance Sheet 页面获取数据...');
    const balanceUrl = `https://stockanalysis.com/stocks/${saSymbol}/financials/balance-sheet/`;
    const balanceRes = await fetch(balanceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    let cashValue = '';
    let debtValue = '';
    let sharesValue = '';
    
    if (balanceRes.ok) {
      const balanceHtml = await balanceRes.text();
      
      // Cash & Short-Term Investments
      cashValue = extractRowValue(balanceHtml, [
        'Cash & Short-Term Investments',
        'Cash &amp; Short-Term Investments'
      ]);
      log.success(`  ✅ Cash & Short-Term Investments: ${cashValue} 百万美元`);
      
      // Total Debt
      debtValue = extractRowValue(balanceHtml, ['Total Debt']);
      log.success(`  ✅ Total Debt: ${debtValue} 百万美元`);
      
      // Total Common Shares Outstanding
      sharesValue = extractRowValue(balanceHtml, ['Total Common Shares Outstanding']);
      log.success(`  ✅ Total Common Shares Outstanding: ${sharesValue} 百万股`);
    } else {
      log.error(`  ❌ 获取失败: HTTP ${balanceRes.status}`);
    }
    
    // 解析数值
    log.info('\n🔢 步骤4: 解析数值...');
    const fcf = parseValue(fcfValue);
    const cash = parseValue(cashValue);
    const debt = parseValue(debtValue);
    const shares = parseShares(sharesValue);
    
    console.log(`  Free Cash Flow: ${fcf.toLocaleString()} 百万美元`);
    console.log(`  Cash & Short-Term Investments: ${cash.toLocaleString()} 百万美元`);
    console.log(`  Total Debt: ${debt.toLocaleString()} 百万美元`);
    console.log(`  Total Common Shares Outstanding: ${shares.toLocaleString()} 百万股`);
    console.log(`  当前股价: $${currentPrice}`);
    
    // 断言验证
    log.info('\n✅ 断言验证:');
    let passed = 0;
    let failed = 0;
    
    // 验证 FCF (Apple 2024 FCF 约 123,324 百万美元)
    if (fcf > 100000 && fcf < 150000) {
      log.success(`  ✓ Free Cash Flow 在预期范围内: ${fcf.toLocaleString()} 百万美元`);
      passed++;
    } else {
      log.error(`  ✗ Free Cash Flow 不在预期范围内: ${fcf} (预期: 100,000-150,000)`);
      failed++;
    }
    
    // 验证 Cash (Apple 约 66,907 百万美元)
    if (cash > 60000 && cash < 80000) {
      log.success(`  ✓ Cash & Short-Term Investments 在预期范围内: ${cash.toLocaleString()} 百万美元`);
      passed++;
    } else {
      log.error(`  ✗ Cash & Short-Term Investments 不在预期范围内: ${cash} (预期: 60,000-80,000)`);
      failed++;
    }
    
    // 验证 Debt (Apple 约 90,509 百万美元)
    if (debt > 80000 && debt < 120000) {
      log.success(`  ✓ Total Debt 在预期范围内: ${debt.toLocaleString()} 百万美元`);
      passed++;
    } else {
      log.error(`  ✗ Total Debt 不在预期范围内: ${debt} (预期: 80,000-120,000)`);
      failed++;
    }
    
    // 验证 Shares (Apple 约 14,703 百万股)
    if (shares > 14000 && shares < 16000) {
      log.success(`  ✓ Total Common Shares Outstanding 在预期范围内: ${shares.toLocaleString()} 百万股`);
      passed++;
    } else {
      log.error(`  ✗ Total Common Shares Outstanding 不在预期范围内: ${shares} (预期: 14,000-16,000)`);
      failed++;
    }
    
    // 验证股价
    if (currentPrice > 200 && currentPrice < 400) {
      log.success(`  ✓ 当前股价在预期范围内: $${currentPrice}`);
      passed++;
    } else {
      log.error(`  ✗ 当前股价不在预期范围内: $${currentPrice} (预期: 200-400)`);
      failed++;
    }
    
    // 测试总结
    console.log('\n' + '='.repeat(70));
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
    console.error(error);
    process.exit(1);
  }
}

// 运行测试
testAppleFinancials();
