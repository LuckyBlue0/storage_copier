console.log("Panel.js is loading...");

document.addEventListener("DOMContentLoaded", async function () {
  console.log("DOM Content Loaded");

  const refreshBtn = document.getElementById("refresh");
  const storageList = document.getElementById("storage-list");
  const statusDiv = document.getElementById("status");

  if (!refreshBtn || !storageList || !statusDiv) {
    console.error("Some elements were not found!");
    return;
  }

  console.log("All elements found successfully");

  function showStatus(message, type = "info") {
    console.log("Status:", message, "Type:", type);
    statusDiv.textContent = message;
    statusDiv.className = type;
    setTimeout(() => {
      statusDiv.textContent = "";
      statusDiv.className = "";
    }, 3000);
  }

  // 生成可执行代码
  function generateExecutableCode(data, source) {
    return `
// 会话存储数据导入脚本 - 来自 ${source}
(function() {
  const data = ${JSON.stringify(data, null, 2)};
  Object.entries(data).forEach(([key, value]) => {
    try {
      sessionStorage.setItem(key, value);
      console.log('✅ 成功导入:', key);
    } catch (error) {
      console.error('❌ 导入失败:', key, error);
    }
  });
  console.log('🎉 导入完成！');
})();`;
  }

  // 全局变量，用于存储重试次数
  let retryCount = 0;
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1秒

  // 检查扩展连接状态
  function checkExtensionConnection() {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.getBackgroundPage((backgroundPage) => {
          if (chrome.runtime.lastError || !backgroundPage) {
            reject(new Error('Extension disconnected'));
          } else {
            resolve(true);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // 重新连接扩展
  async function reconnectExtension() {
    if (retryCount >= MAX_RETRIES) {
      showToast('扩展连接失败，请刷新页面重试', 'error');
      retryCount = 0;
      return false;
    }

    retryCount++;
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
  
    try {
      await checkExtensionConnection();
      retryCount = 0;
      return true;
    } catch (error) {
      console.log(`重连尝试 ${retryCount}/${MAX_RETRIES} 失败`);
      return false;
    }
  }

  // 带重试的执行函数
  async function executeWithRetry(operation) {
    try {
      return await operation();
    } catch (error) {
      console.error('操作失败:', error);
      
      if (error.message.includes('Extension context invalidated') || 
          error.message.includes('Extension disconnected')) {
        showToast('扩展连接已断开，正在重新连接...', 'warning');
        
        if (await reconnectExtension()) {
          // 重新连接成功，重试操作
          try {
            return await operation();
          } catch (retryError) {
            throw retryError;
          }
        }
      }
      throw error;
    }
  }

  // 刷新数据的函数
  async function refreshStorageData() {
    try {
      await executeWithRetry(async () => {
        // 清空现有内容
        storageList.innerHTML = "";

        // 获取当前标签页
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        if (!tab) {
          throw new Error("没有找到活动标签页");
        }

        // 创建会话存储部分的标题
        const sessionTitle = document.createElement("h2");
        sessionTitle.textContent = "会话存储数据";
        storageList.appendChild(sessionTitle);

        // 获取会话存储数据
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          function: getSessionStorageData,
        });

        // 显示会话存储数据
        displaySessionStorageData(results, tab);

        // 创建Cookie部分的标题
        const cookieTitle = document.createElement("h2");
        cookieTitle.textContent = "Cookie数据";
        storageList.appendChild(cookieTitle);

        // 获取和显示Cookie数据
        await displayCookieData(tab);
      });
    } catch (error) {
      console.error("刷新数据失败:", error);
      showStatus("刷新数据失败，请查看控制台了解详情", "error");
    }
  }

  // 显示会话存储数据的函数
  function displaySessionStorageData(results, tab) {
    if (!results || results.length === 0) {
      const noDataDiv = document.createElement("div");
      noDataDiv.textContent = "没有会话存储数据";
      storageList.appendChild(noDataDiv);
      return;
    }

    // 用于存储所有数据的对象
    const allStorageData = {};

    results.forEach((result) => {
      if (!result.result || Object.keys(result.result).length === 0) {
        return;
      }

      const frameDiv = document.createElement("div");
      frameDiv.className = "frame-data";

      // 创建源信息标题
      const sourceTitle = document.createElement("h3");
      sourceTitle.textContent =
        result.frameId === 0 ? "主框架" : `框架 ${result.frameId}`;
      frameDiv.appendChild(sourceTitle);

      // 创建数据表格
      const table = document.createElement("table");
      table.innerHTML = `
        <tr>
          <th>键</th>
          <th>值</th>
          <th>操作</th>
        </tr>
      `;

      // 添加数据行
      Object.entries(result.result).forEach(([key, value]) => {
        // 添加到总数据中
        allStorageData[key] = value;

        const row = document.createElement("tr");

        // 键列
        const keyCell = document.createElement("td");
        keyCell.textContent = key;
        row.appendChild(keyCell);

        // 值列
        const valueCell = document.createElement("td");
        valueCell.textContent = value;
        row.appendChild(valueCell);

        // 操作列
        const actionCell = document.createElement("td");

        // 复制按钮
        const copyButton = document.createElement("button");
        copyButton.textContent = "复制";
        copyButton.onclick = () => {
          const code = generateExecutableCode({ [key]: value }, "单个项目");
          navigator.clipboard.writeText(code);
          showStatus("代码已复制到剪贴板", "success");
        };
        actionCell.appendChild(copyButton);

        // 执行按钮
        const executeButton = document.createElement("button");
        executeButton.textContent = "执行";
        executeButton.onclick = async () => {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              function: (key, value) => {
                sessionStorage.setItem(key, value);
              },
              args: [key, value],
            });
            showStatus("数据已成功设置到会话存储", "success");
          } catch (error) {
            console.error("执行失败:", error);
            showStatus("执行失败，请查看控制台了解详情", "error");
          }
        };
        actionCell.appendChild(executeButton);

        // 删除按钮
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "删除";
        deleteButton.onclick = async () => {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              function: (key) => {
                sessionStorage.removeItem(key);
              },
              args: [key],
            });
            showStatus(`已删除键 "${key}"`, "success");
            refreshStorageData(); // 刷新显示
          } catch (error) {
            console.error("删除失败:", error);
            showStatus("删除失败，请查看控制台了解详情", "error");
          }
        };
        actionCell.appendChild(deleteButton);

        row.appendChild(actionCell);
        table.appendChild(row);
      });

      frameDiv.appendChild(table);
      storageList.appendChild(frameDiv);
    });

    // 添加批量操作按钮
    if (Object.keys(allStorageData).length > 0) {
      const batchDiv = document.createElement("div");
      batchDiv.className = "batch-operations";

      // 复制所有按钮
      const copyAllButton = document.createElement("button");
      copyAllButton.textContent = "复制所有会话存储";
      copyAllButton.onclick = () => {
        const code = generateExecutableCode(allStorageData, "所有会话存储");
        navigator.clipboard.writeText(code);
        showStatus("所有会话存储数据的代码已复制到剪贴板", "success");
      };
      batchDiv.appendChild(copyAllButton);

      // 导入所有按钮
      const importAllButton = document.createElement("button");
      importAllButton.textContent = "导入所有会话存储";
      importAllButton.onclick = async () => {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: (data) => {
              Object.entries(data).forEach(([key, value]) => {
                try {
                  sessionStorage.setItem(key, value);
                  console.log("✅ 成功导入:", key);
                } catch (error) {
                  console.error("❌ 导入失败:", key, error);
                }
              });
            },
            args: [allStorageData],
          });
          showStatus("所有会话存储数据已导入", "success");
        } catch (error) {
          console.error("导入所有数据失败:", error);
          showStatus("导入失败，请查看控制台了解详情", "error");
        }
      };
      batchDiv.appendChild(importAllButton);

      // 删除所有按钮
      const deleteAllButton = document.createElement("button");
      deleteAllButton.textContent = "删除所有会话存储";
      deleteAllButton.onclick = async () => {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
              sessionStorage.clear();
            },
          });
          showStatus("所有会话存储数据已删除", "success");
          refreshStorageData(); // 刷新显示
        } catch (error) {
          console.error("删除所有数据失败:", error);
          showStatus("删除失败，请查看控制台了解详情", "error");
        }
      };
      batchDiv.appendChild(deleteAllButton);

      storageList.appendChild(batchDiv);
    }
  }

  // 显示Cookie数据的函数
  async function displayCookieData(tab) {
    try {
      const url = new URL(tab.url);
      const cookies = await chrome.cookies.getAll({ domain: url.hostname });

      if (!cookies || cookies.length === 0) {
        const noDataDiv = document.createElement("div");
        noDataDiv.textContent = "没有Cookie数据";
        storageList.appendChild(noDataDiv);
        return;
      }

      // 创建数据表格
      const table = document.createElement("table");
      table.innerHTML = `
        <tr>
          <th>名称</th>
          <th>值</th>
          <th>域</th>
          <th>路径</th>
          <th>过期时间</th>
          <th>操作</th>
        </tr>
      `;

      // 添加数据行
      cookies.forEach((cookie) => {
        const row = document.createElement("tr");

        // 添加cookie信息列
        const addCell = (content) => {
          const cell = document.createElement("td");
          cell.textContent = content;
          row.appendChild(cell);
        };

        addCell(cookie.name);
        addCell(cookie.value);
        addCell(cookie.domain);
        addCell(cookie.path);
        addCell(
          cookie.expirationDate
            ? new Date(cookie.expirationDate * 1000).toLocaleString()
            : "会话结束时"
        );

        // 操作列
        const actionCell = document.createElement("td");

        // 复制按钮
        const copyButton = document.createElement("button");
        copyButton.textContent = "复制";
        copyButton.onclick = () => {
          const cookieCode = `
            chrome.cookies.set({
              url: "${tab.url}",
              name: "${cookie.name}",
              value: "${cookie.value}",
              domain: "${cookie.domain}",
              path: "${cookie.path}",
              secure: ${cookie.secure},
              httpOnly: ${cookie.httpOnly},
              sameSite: "${cookie.sameSite}",
              ${
                cookie.expirationDate
                  ? `expirationDate: ${cookie.expirationDate},`
                  : ""
              }
            });
          `;
          navigator.clipboard.writeText(cookieCode);
          showStatus("Cookie代码已复制到剪贴板");
        };
        actionCell.appendChild(copyButton);

        // 删除按钮
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "删除";
        deleteButton.onclick = async () => {
          try {
            await chrome.cookies.remove({
              url: tab.url,
              name: cookie.name,
            });
            showStatus(`Cookie "${cookie.name}" 已删除`);
            refreshStorageData(); // 刷新显示
          } catch (error) {
            console.error("删除Cookie失败:", error);
            showStatus("删除Cookie失败，请查看控制台了解详情", "error");
          }
        };
        actionCell.appendChild(deleteButton);

        row.appendChild(actionCell);
        table.appendChild(row);
      });

      // 添加批量操作按钮
      const batchDiv = document.createElement("div");
      batchDiv.className = "batch-operations";

      // 复制所有按钮
      const copyAllButton = document.createElement("button");
      copyAllButton.textContent = "复制所有Cookie";
      copyAllButton.onclick = () => {
        const cookiesCode = cookies
          .map(
            (cookie) => `
          chrome.cookies.set({
            url: "${tab.url}",
            name: "${cookie.name}",
            value: "${cookie.value}",
            domain: "${cookie.domain}",
            path: "${cookie.path}",
            secure: ${cookie.secure},
            httpOnly: ${cookie.httpOnly},
            sameSite: "${cookie.sameSite}",
            ${
              cookie.expirationDate
                ? `expirationDate: ${cookie.expirationDate},`
                : ""
            }
          });
        `
          )
          .join("\n");
        navigator.clipboard.writeText(cookiesCode);
        showStatus("所有Cookie代码已复制到剪贴板");
      };
      batchDiv.appendChild(copyAllButton);

      // 删除所有按钮
      const deleteAllButton = document.createElement("button");
      deleteAllButton.textContent = "删除所有Cookie";
      deleteAllButton.onclick = async () => {
        try {
          for (const cookie of cookies) {
            await chrome.cookies.remove({
              url: tab.url,
              name: cookie.name,
            });
          }
          showStatus("所有Cookie已删除");
          refreshStorageData(); // 刷新显示
        } catch (error) {
          console.error("删除所有Cookie失败:", error);
          showStatus("删除Cookie失败，请查看控制台了解详情", "error");
        }
      };
      batchDiv.appendChild(deleteAllButton);

      storageList.appendChild(table);
      storageList.appendChild(batchDiv);
    } catch (error) {
      console.error("显示Cookie数据失败:", error);
      showStatus("显示Cookie数据失败，请查看控制台了解详情", "error");
    }
  }

  // 显示提示消息
  function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast toast-${type} show`;

    setTimeout(() => {
      toast.className = toast.className.replace('show', '');
    }, 3000);
  }

  // 添加刷新按钮事件监听器
  refreshBtn.addEventListener("click", refreshStorageData);

  // 初始加载数据
  console.log("Initial data load");
  refreshStorageData();
});

// 获取会话存储数据的函数
function getSessionStorageData() {
  const data = {};
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    data[key] = sessionStorage.getItem(key);
  }
  return data;
}
