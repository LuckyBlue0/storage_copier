// 监听来自background script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);
  
  if (message.action === "getSessionStorage") {
    // 收集sessionStorage数据
    const data = {};
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        data[key] = sessionStorage.getItem(key);
      }
      console.log("✅ 成功收集sessionStorage数据:", Object.keys(data).length, "个项目");
      
      // 发送数据到background script
      chrome.runtime.sendMessage({
        action: "saveSessionStorage",
        data: data,
      });
    } catch (e) {
      console.error("❌ 收集sessionStorage数据失败:", e);
    }
  } else if (message.action === "importSessionStorage") {
    try {
      const data = message.data;
      let successCount = 0;
      let failCount = 0;
      
      Object.entries(data).forEach(([key, value]) => {
        try {
          sessionStorage.setItem(key, value);
          console.log("✅ 成功设置:", key);
          successCount++;
        } catch (e) {
          console.error("❌ 设置失败:", key, e);
          failCount++;
        }
      });
      
      console.log(`🎉 导入完成！成功: ${successCount} 个，失败: ${failCount} 个`);
    } catch (e) {
      console.error("❌ 导入失败:", e);
    }
  } else if (message.action === "savingComplete") {
    if (message.success) {
      console.log("✅ 数据已成功保存到扩展存储中");
    }
  }
  
  // 确保消息得到响应
  sendResponse({ received: true });
  return true;
});
