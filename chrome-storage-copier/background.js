// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
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
});

// 获取当前frame的sessionStorage数据
async function getSessionStorageData() {
  console.log("🚀 getSessionStorageData 开始执行");

  const data = {};
  const frameUrl = window.location.href;
  console.log(`🔍 当前frame URL: ${frameUrl}`);

  try {
    // 检查sessionStorage是否可用
    if (typeof sessionStorage === "undefined") {
      console.error("❌ sessionStorage 不可用");
      return;
    }

    console.log(`📊 sessionStorage.length = ${sessionStorage.length}`);

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      data[key] = sessionStorage.getItem(key);
    }

    console.log(`📦 收集到的数据:`, data);

    if (Object.keys(data).length > 0) {
      console.log(
        `✅ 成功收集 ${frameUrl} 的数据:`,
        Object.keys(data).length,
        "个项目"
      );

      // 尝试直接发送消息
      try {
        console.log("📤 正在发送消息到background...");
        const response = await chrome.runtime.sendMessage({
          action: "saveSessionStorage",
          data: data,
          frameUrl: frameUrl,
        });
        console.log("📫 消息发送结果:", response);
      } catch (e) {
        console.error("❌ 发送消息失败:", e);
        // 尝试使用其他方式保存数据
        try {
          console.log("🔄 尝试直接保存到storage...");
          await chrome.storage.local.set({
            [`sessionStorage_${frameUrl}`]: data,
          });
          console.log("✅ 直接保存成功");
        } catch (e2) {
          console.error("❌ 直接保存也失败:", e2);
        }
      }
    } else {
      console.log(`ℹ️ ${frameUrl} 没有sessionStorage数据`);
    }
  } catch (e) {
    console.error(`❌ 收集数据失败:`, e);
  }
}

// 导入sessionStorage数据的函数
async function importSessionStorageData(allData) {
  console.log("🚀 importSessionStorageData 开始执行");
  const currentUrl = window.location.href;
  console.log(`🔍 当前frame URL: ${currentUrl}`);
  console.log("📦 收到的数据:", allData);

  try {
    // 检查sessionStorage是否可用
    if (typeof sessionStorage === "undefined") {
      console.error("❌ sessionStorage 不可用");
      return;
    }

    // 合并所有来源的数据
    let mergedData = {};

    // 遍历所有URL的数据并合并
    Object.values(allData).forEach((urlData) => {
      Object.entries(urlData).forEach(([key, value]) => {
        mergedData[key] = value;
      });
    });

    if (Object.keys(mergedData).length === 0) {
      console.log("⚠️ 没有找到任何可导入的数据");
      return;
    }

    console.log(`📥 准备导入的合并数据:`, mergedData);

    // 清空当前sessionStorage
    console.log("🗑️ 清空当前sessionStorage");
    sessionStorage.clear();

    let success = 0;
    let fail = 0;

    // 导入合并后的数据
    for (const [key, value] of Object.entries(mergedData)) {
      try {
        sessionStorage.setItem(key, value);
        console.log(`✅ 成功导入: ${key} = ${value}`);
        success++;
      } catch (e) {
        console.error(`❌ 导入失败: ${key}`, e);
        fail++;
      }
    }

    console.log(`🎉 导入完成！成功: ${success} 个，失败: ${fail} 个`);

    // 验证导入结果
    const imported = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      imported[key] = sessionStorage.getItem(key);
    }
    console.log("📊 导入后的sessionStorage内容:", imported);
  } catch (e) {
    console.error(`❌ 导入过程中发生错误:`, e);
  }
}

let collectedData = {};

// 在所有frame中显示toast
async function showToastInAllFrames(message, type) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]) {
    await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id, allFrames: true },
      function: (message, type) => {
        // 直接定义并执行toast函数
        function createToast(msg, toastType) {
          // 移除已存在的toast
          const existingToast = document.getElementById(
            "chrome-storage-copier-toast"
          );
          if (existingToast) {
            existingToast.remove();
          }

          // 创建toast容器
          const toast = document.createElement("div");
          toast.id = "chrome-storage-copier-toast";

          // 设置基础样式
          toast.style.cssText = `
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) scale(0.8);
            padding: 12px 20px;
            min-width: 160px;
            max-width: 60%;
            background-color: ${
              toastType === "success"
                ? "#4caf50"
                : toastType === "error"
                ? "#f44336"
                : "#2196f3"
            };
            color: white;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 14px;
            text-align: center;
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          `;

          // 添加图标
          const icon = document.createElement("div");
          icon.style.cssText = `
            font-size: 20px;
            margin-bottom: 4px;
          `;
          icon.textContent =
            toastType === "success"
              ? "✅"
              : toastType === "error"
              ? "❌"
              : "ℹ️";
          toast.appendChild(icon);

          // 添加消息文本
          const text = document.createElement("div");
          text.style.cssText = `
            line-height: 1.4;
            word-break: break-word;
          `;
          text.textContent = msg;
          toast.appendChild(text);

          // 添加到页面
          document.body.appendChild(toast);

          // 显示动画
          requestAnimationFrame(() => {
            toast.style.opacity = "1";
            toast.style.transform = "translate(-50%, -50%) scale(1)";
          });

          // 3秒后隐藏
          setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translate(-50%, -50%) scale(0.8)";
            setTimeout(() => {
              toast.remove();
            }, 300);
          }, 3000);
        }

        // 确保DOM已加载
        if (document.readyState === "complete") {
          createToast(message, type);
        } else {
          window.addEventListener("load", () => {
            createToast(message, type);
          });
        }
      },
      args: [message, type],
    });
  }
}

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "copySessionStorage") {
    console.log("🎯 触发复制操作");
    // 重置收集的数据
    collectedData = {};

    try {
      // 在所有frame中执行获取数据的脚本
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        function: getSessionStorageData,
      });
      console.log("📊 脚本执行结果:", results);

      // 显示复制成功的toast
      await showToastInAllFrames("数据复制成功！", "success");
    } catch (e) {
      console.error("❌ 执行脚本失败:", e);
      await showToastInAllFrames("复制失败，请查看控制台了解详情", "error");
    }
  } else if (info.menuItemId === "importSessionStorage") {
    console.log("🎯 触发导入操作");
    // 从storage获取数据
    chrome.storage.local.get(null, async function (result) {
      console.log("📦 storage中的所有数据:", result);

      const sessionStorageData = {};

      // 收集所有相关的数据
      Object.entries(result).forEach(([key, value]) => {
        if (key === "sessionStorageData") {
          // 合并主数据
          Object.assign(sessionStorageData, value);
        } else if (key.startsWith("sessionStorage_")) {
          // 合并单独存储的数据
          const url = key.replace("sessionStorage_", "");
          sessionStorageData[url] = value;
        }
      });

      if (Object.keys(sessionStorageData).length > 0) {
        console.log("📦 准备导入的数据:", sessionStorageData);
        try {
          // 在所有frame中执行导入数据的脚本
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            function: importSessionStorageData,
            args: [sessionStorageData],
          });
          console.log("📊 导入脚本执行结果:", results);

          // 显示导入成功的toast
          await showToastInAllFrames("数据导入成功！", "success");
        } catch (e) {
          console.error("❌ 执行导入脚本失败:", e);
          await showToastInAllFrames("导入失败，请查看控制台了解详情", "error");
        }
      } else {
        console.log("⚠️ 没有找到要导入的数据");
        await showToastInAllFrames("没有找到可导入的数据", "error");
      }
    });
  }
});

// 监听来自注入脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 收到消息:", message);

  if (message.action === "saveSessionStorage") {
    console.log(`📥 收到来自 ${message.frameUrl} 的数据:`, message.data);

    // 如果有数据，添加到收集的数据中
    if (Object.keys(message.data).length > 0) {
      collectedData[message.frameUrl] = message.data;
      console.log("📦 当前收集的所有数据:", collectedData);

      // 延迟保存，等待所有frame的数据都收集完
      setTimeout(() => {
        if (Object.keys(collectedData).length > 0) {
          console.log("💾 正在保存所有收集的数据...");
          chrome.storage.local.set(
            {
              sessionStorageData: collectedData,
            },
            function () {
              console.log(
                '✅ 数据已保存！现在可以在目标页面右键选择"导入会话存储数据"'
              );
              console.log("📊 已保存的数据结构:", collectedData);
              // 清理收集的数据
              collectedData = {};
            }
          );
        }
      }, 500);
    }
  }

  // 确保消息处理完成
  sendResponse({ received: true });
  return true;
});
