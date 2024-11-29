// 在扩展启动时输出日志
console.log("🚀 Storage Copier background script loaded");

// 存储临时数据的变量
let cookieData = null;
let sessionStorageData = null;

// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  console.log("📋 Creating context menus...");
  chrome.contextMenus.create({
    id: "copySessionStorage",
    title: "复制会话存储数据",
    contexts: ["page", "frame"],
  });

  chrome.contextMenus.create({
    id: "importSessionStorage",
    title: "导入会话存储数据",
    contexts: ["page", "frame"],
  });

  // 添加复制和导入cookie的菜单项
  chrome.contextMenus.create({
    id: "copyCookies",
    title: "复制Cookie数据",
    contexts: ["page", "frame"],
  });

  chrome.contextMenus.create({
    id: "importCookies",
    title: "导入Cookie数据",
    contexts: ["page", "frame"],
  });
});

// 监听快捷键命令
chrome.commands.onCommand.addListener(async (command) => {
  console.log("⌨️ Command received:", command);

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab) {
      console.error("❌ No active tab found");
      await showToastInAllFrames("错误：没有找到活动标签页", "error");
      return;
    }
    console.log("📑 Current tab:", tab.url);

    switch (command) {
      case "copy-cookies":
        console.log("🍪 Copying cookies...");
        const url = new URL(tab.url);
        const cookies = await chrome.cookies.getAll({ domain: url.hostname });
        console.log(`📊 Found ${cookies.length} cookies`);

        if (cookies && cookies.length > 0) {
          const cookieData = generateCookieScript(cookies);
          console.log("📋 Cookie data generated:", cookieData);

          // 使用 content script 来复制到剪贴板
          await chrome.scripting
            .executeScript({
              target: { tabId: tab.id },
              function: (text) => {
                try {
                  // 使用传统的 execCommand 方法
                  const textArea = document.createElement("textarea");
                  textArea.value = text;
                  textArea.style.position = 'fixed';
                  textArea.style.left = '-9999px';
                  document.body.appendChild(textArea);
                  textArea.select();
                  const success = document.execCommand("copy");
                  document.body.removeChild(textArea);
                  return success;
                } catch (e) {
                  console.error("复制失败:", e);
                  return false;
                }
              },
              args: [cookieData],
            })
            .then(async (result) => {
              const success = result[0]?.result;
              console.log(success ? "✅ Copied to clipboard" : "❌ Copy failed");
              await showToastInAllFrames(
                success ? "已复制所有Cookie" : "Cookie复制失败",
                success ? "success" : "error"
              );
            });
        } else {
          console.log("⚠️ No cookies found");
          await showToastInAllFrames("没有找到可复制的Cookie", "error");
        }
        break;

      case "import-cookies":
        console.log("🔄 Importing cookies...");
        // 使用 content script 来读取剪贴板
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            try {
              // 使用传统的 execCommand 方法
              const textArea = document.createElement("textarea");
              textArea.style.position = 'fixed';
              textArea.style.left = '-9999px';
              document.body.appendChild(textArea);
              textArea.focus();
              const success = document.execCommand("paste");
              const text = textArea.value;
              document.body.removeChild(textArea);
              return { success, text };
            } catch (e) {
              console.error("粘贴失败:", e);
              return { success: false, text: "" };
            }
          },
        });

        const { success: pasteSuccess, text: clipboardText } = result[0].result;
        console.log(pasteSuccess ? "✅ Read from clipboard" : "❌ Paste failed");
        console.log("📋 Clipboard content:", clipboardText);

        if (!pasteSuccess || !clipboardText) {
          console.error("❌ Failed to read clipboard");
          await showToastInAllFrames("无法读取剪贴板数据", "error");
          break;
        }

        try {
          let cookiesData;
          try {
            cookiesData = JSON.parse(clipboardText);
          } catch (e) {
            console.error("❌ Invalid JSON format:", e);
            console.log("Invalid content:", clipboardText);
            await showToastInAllFrames("剪贴板中的数据格式无效", "error");
            break;
          }

          if (Array.isArray(cookiesData)) {
            console.log(`📥 Importing ${cookiesData.length} cookies...`);
            let successCount = 0;
            let failCount = 0;
            let skippedCount = 0;

            for (const cookie of cookiesData) {
              try {
                // 清理和验证 Cookie 属性
                const cleanCookie = sanitizeCookie(cookie, tab.url);
                console.log(`🍪 Setting cookie:`, cleanCookie);
                
                await chrome.cookies.set(cleanCookie);
                successCount++;
                console.log(`✅ Set cookie: ${cookie.name}`);
              } catch (error) {
                console.error(`❌ Failed to set cookie: ${cookie.name}`, error);
                console.log('Problem cookie:', cookie);
                failCount++;
              }
            }

            const message = `成功导入 ${successCount} 个Cookie${
              failCount > 0 ? `，${failCount} 个失败` : ""
            }${skippedCount > 0 ? `，${skippedCount} 个跳过` : ""}`;
            console.log(`📊 Import complete: ${message}`);
            await showToastInAllFrames(
              message,
              failCount === 0 ? "success" : "warning"
            );
          } else {
            console.error("❌ Invalid data format: not an array");
            await showToastInAllFrames("剪贴板中的数据格式无效", "error");
          }
        } catch (error) {
          console.error("❌ Failed to parse cookie data:", error);
          await showToastInAllFrames("导入失败：数据格式错误", "error");
        }
        break;

      case "copy-session-storage":
        console.log("🎯 通过快捷键触发复制操作");
        chrome.tabs.query(
          { active: true, currentWindow: true },
          async function (tabs) {
            if (!tabs[0]) {
              console.error("❌ 没有找到活动标签页");
              return;
            }
            try {
              // 注入并执行脚本来收集数据
              const results = await chrome.scripting.executeScript({
                target: { tabId: tabs[0].id, allFrames: true },
                function: () => {
                  const data = {};
                  for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    data[key] = sessionStorage.getItem(key);
                  }
                  return {
                    frameId: window.frameElement ? window.frameElement.id : 0,
                    data: data
                  };
                }
              });

              if (results && results.length > 0) {
                sessionStorageData = results;
                console.log("📦 会话存储数据已保存到内存中");
                await showToastInAllFrames("会话存储数据已复制！", "success");
              } else {
                console.log("❌ 未找到任何会话存储数据");
                sessionStorageData = null;
                await showToastInAllFrames("没有找到会话存储数据", "error");
              }
            } catch (error) {
              console.error("复制会话存储失败:", error);
              sessionStorageData = null;
              await showToastInAllFrames("复制会话存储失败，请查看控制台了解详情", "error");
            }
          }
        );
        break;

      case "import-session-storage":
        console.log("🎯 通过快捷键触发导入操作");
        try {
          if (!sessionStorageData) {
            console.log("❌ 没有可导入的数据");
            await showToastInAllFrames("没有可导入的数据", "error");
            return;
          }

          // 注入并执行脚本来导入数据
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: (data) => {
              try {
                data.forEach(result => {
                  const storageData = result.result.data;
                  Object.entries(storageData).forEach(([key, value]) => {
                    try {
                      sessionStorage.setItem(key, value);
                      console.log("✅ 成功导入:", key);
                    } catch (error) {
                      console.error("❌ 导入失败:", key, error);
                    }
                  });
                });
                return true;
              } catch (error) {
                console.error("导入过程中出错:", error);
                return false;
              }
            },
            args: [sessionStorageData]
          });

          console.log("✅ 导入完成");
          await showToastInAllFrames("会话存储数据已导入！", "success");
        } catch (error) {
          console.error("导入会话存储失败:", error);
          await showToastInAllFrames("导入会话存储失败，请查看控制台了解详情", "error");
        }
        break;

      default:
        console.log("⚠️ Unknown command:", command);
    }
  } catch (error) {
    console.error("❌ Command execution failed:", error);
    await showToastInAllFrames("操作失败: " + error.message, "error");
  }
});

// 监听上下文菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "copySessionStorage") {
    console.log("🎯 触发复制会话存储操作");
    try {
      // 注入并执行脚本来收集数据
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        function: () => {
          const data = {};
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            data[key] = sessionStorage.getItem(key);
          }
          return {
            frameId: window.frameElement ? window.frameElement.id : 0,
            data: data
          };
        }
      });

      if (results && results.length > 0) {
        sessionStorageData = results;
        console.log("📦 会话存储数据已保存到内存中");
        await showToastInAllFrames("会话存储数据已复制！", "success");
      } else {
        console.log("❌ 未找到任何会话存储数据");
        sessionStorageData = null;
        await showToastInAllFrames("没有找到会话存储数据", "error");
      }
    } catch (error) {
      console.error("复制会话存储失败:", error);
      sessionStorageData = null;
      await showToastInAllFrames("复制会话存储失败，请查看控制台了解详情", "error");
    }
  } else if (info.menuItemId === "importSessionStorage") {
    console.log("🎯 触发导入会话存储操作");
    try {
      if (!sessionStorageData) {
        console.log("❌ 没有可导入的数据");
        await showToastInAllFrames("没有可导入的数据", "error");
        return;
      }

      // 注入并执行脚本来导入数据
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: (data) => {
          try {
            data.forEach(result => {
              const storageData = result.result.data;
              Object.entries(storageData).forEach(([key, value]) => {
                try {
                  sessionStorage.setItem(key, value);
                  console.log("✅ 成功导入:", key);
                } catch (error) {
                  console.error("❌ 导入失败:", key, error);
                }
              });
            });
            return true;
          } catch (error) {
            console.error("导入过程中出错:", error);
            return false;
          }
        },
        args: [sessionStorageData]
      });

      console.log("✅ 导入完成");
      await showToastInAllFrames("会话存储数据已导入！", "success");
    } catch (error) {
      console.error("导入会话存储失败:", error);
      await showToastInAllFrames("导入会话存储失败，请查看控制台了解详情", "error");
    }
  } else if (info.menuItemId === "copyCookies") {
    console.log("🎯 触发复制Cookie操作");
    if (!tab) {
      console.error("❌ 没有找到活动标签页");
      return;
    }

    try {
      const url = new URL(tab.url);
      console.log(`🔍 开始获取Cookies，URL: ${tab.url}`);

      // 获取当前域名下的所有cookies
      const cookies = await chrome.cookies.getAll({ domain: url.hostname });
      console.log(`获取到 ${cookies.length} 个cookies:`, cookies);

      if (cookies.length > 0) {
        // 存储cookie数据
        cookieData = cookies;
        console.log("📦 Cookie数据已保存到内存中");
        await showToastInAllFrames(
          `成功复制 ${cookies.length} 个 cookies！`,
          "success"
        );
      } else {
        console.log("❌ 未找到任何cookies");
        cookieData = null;
        await showToastInAllFrames("未找到任何 cookies", "error");
      }
    } catch (error) {
      console.error("复制Cookie失败:", error);
      cookieData = null;
      await showToastInAllFrames(
        "复制Cookie失败，请查看控制台了解详情",
        "error"
      );
    }
  } else if (info.menuItemId === "importCookies") {
    console.log("🎯 触发导入Cookie操作");
    if (!tab || !cookieData) {
      console.error("❌ 没有找到活动标签页或没有可导入的Cookie数据");
      await showToastInAllFrames("没有可导入的Cookie数据", "error");
      return;
    }

    try {
      const url = new URL(tab.url);
      const currentDomain = url.hostname;
      console.log(`准备导入Cookie到域名: ${currentDomain}`);

      let importCount = 0;
      let failCount = 0;

      for (const cookie of cookieData) {
        try {
          // 创建新的cookie对象
          const newCookie = {
            name: cookie.name,
            value: cookie.value,
            domain: currentDomain,
            path: cookie.path || "/",
            secure: cookie.secure || false,
            httpOnly: cookie.httpOnly || false,
            sameSite: cookie.sameSite || "lax",
            url: tab.url,
          };

          if (cookie.expirationDate) {
            newCookie.expirationDate = cookie.expirationDate;
          }

          console.log(`正在设置cookie: ${newCookie.name}`);
          await chrome.cookies.set(newCookie);
          importCount++;
        } catch (error) {
          failCount++;
          console.error(`设置cookie失败:`, error);
        }
      }

      if (importCount > 0) {
        await showToastInAllFrames(
          `成功导入 ${importCount} 个 cookies！${
            failCount > 0 ? ` (${failCount}个失败)` : ""
          }`,
          "success"
        );
      } else {
        await showToastInAllFrames(
          `没有成功导入任何 cookies ${
            failCount > 0 ? ` (${failCount}个失败)` : ""
          }`,
          "error"
        );
      }
    } catch (error) {
      console.error("导入Cookie失败:", error);
      await showToastInAllFrames(
        "导入Cookie失败，请查看控制台了解详情",
        "error"
      );
    }
  }
});

// 监听来自注入脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 收到消息:", message);

  if (message.type === "storeCookies") {
    cookieData = message.cookies;
    sendResponse({ success: true });
  } else if (message.type === "getCookies") {
    sendResponse({ cookies: cookieData });
  }
  return true;
});

// 在所有frame中显示toast消息
async function showToastInAllFrames(message, type = "info") {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    function: (msg, msgType) => {
      // 创建或获取toast容器
      let toastContainer = document.getElementById(
        "storage-copier-toast-container"
      );
      if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = "storage-copier-toast-container";
        toastContainer.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          font-family: Arial, sans-serif;
        `;
        document.body.appendChild(toastContainer);
      }

      // 创建新的toast
      const toast = document.createElement("div");
      toast.style.cssText = `
        margin-bottom: 10px;
        padding: 12px 24px;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        animation: slideIn 0.5s ease-out;
      `;

      // 设置不同类型的样式
      switch (msgType) {
        case "success":
          toast.style.backgroundColor = "#4CAF50";
          break;
        case "error":
          toast.style.backgroundColor = "#f44336";
          break;
        case "warning":
          toast.style.backgroundColor = "#ff9800";
          break;
        default:
          toast.style.backgroundColor = "#2196F3";
      }

      toast.textContent = msg;

      // 添加动画样式
      const style = document.createElement("style");
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);

      // 添加toast到容器
      toastContainer.appendChild(toast);

      // 3秒后移除toast
      setTimeout(() => {
        toast.style.animation = "slideOut 0.5s ease-in forwards";
        toast.addEventListener("animationend", () => {
          if (toast.parentNode) {
            toastContainer.removeChild(toast);
            if (toastContainer.children.length === 0 && toastContainer.parentNode) {
              document.body.removeChild(toastContainer);
            }
          }
        });
      }, 3000);
    },
    args: [message, type],
  });
}

// 显示通知的函数
function showNotification(message, type = "info") {
  console.log(`🔔 Showing notification: ${message}`);
  showToastInAllFrames(message, type);
}

// 清理和验证 Cookie 属性
function sanitizeCookie(cookie, targetUrl) {
  const url = new URL(targetUrl);
  const cleanCookie = {
    url: url.origin + (cookie.path || '/'),
    name: cookie.name,
    value: cookie.value,
    path: cookie.path || '/',
  };

  // 处理 domain
  if (cookie.domain) {
    // 如果 domain 以点开头，移除它
    let domain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
    // 确保 domain 是目标域名的一部分
    if (url.hostname.endsWith(domain)) {
      cleanCookie.domain = domain;
    }
  }

  // 处理 secure 标志
  if (url.protocol === 'https:') {
    cleanCookie.secure = cookie.secure !== false; // 默认为 true
  } else {
    cleanCookie.secure = Boolean(cookie.secure);
  }

  // 处理 sameSite
  const validSameSiteValues = ['strict', 'lax', 'none'];
  let sameSite = (cookie.sameSite || 'lax').toLowerCase();
  if (!validSameSiteValues.includes(sameSite)) {
    sameSite = 'lax';
  }
  // 如果是 'none'，必须同时设置 secure
  if (sameSite === 'none') {
    cleanCookie.secure = true;
  }
  cleanCookie.sameSite = sameSite;

  // 处理 httpOnly
  cleanCookie.httpOnly = Boolean(cookie.httpOnly);

  // 处理过期时间
  if (cookie.expirationDate && typeof cookie.expirationDate === 'number') {
    // 确保过期时间是未来的时间
    if (cookie.expirationDate > (Date.now() / 1000)) {
      cleanCookie.expirationDate = cookie.expirationDate;
    }
  }

  return cleanCookie;
}

// 生成 Cookie 导入脚本
function generateCookieScript(cookies) {
  // 只保留必要的字段，并确保所有字段都有合法的值
  const sanitizedCookies = cookies.map((cookie) => ({
    name: cookie.name || "",
    value: cookie.value || "",
    domain: cookie.domain || "",
    path: cookie.path || "/",
    secure: Boolean(cookie.secure),
    httpOnly: Boolean(cookie.httpOnly),
    sameSite: cookie.sameSite || "lax",
    ...(cookie.expirationDate ? { expirationDate: cookie.expirationDate } : {}),
  }));

  return JSON.stringify(sanitizedCookies, null, 2);
}
