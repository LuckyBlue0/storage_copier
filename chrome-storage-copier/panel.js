console.log("Panel.js is loading...");

document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM Content Loaded");

  const refreshBtn = document.getElementById("refresh");
  const storageList = document.getElementById("storage-list");
  const statusDiv = document.getElementById("status");

  if (!refreshBtn || !storageList || !statusDiv) {
    console.error("Some elements were not found!");
    return;
  }

  console.log("All elements found successfully");

  function showStatus(message, isError = false) {
    console.log("Status:", message, "Error:", isError);
    statusDiv.textContent = message;
    statusDiv.className = isError ? "error" : "success";
    setTimeout(() => {
      statusDiv.textContent = "";
      statusDiv.className = "";
    }, 3000);
  }

  function copyToClipboard(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      showStatus("复制成功！已生成可执行代码");
    } catch (err) {
      showStatus("复制失败：" + err, true);
    }
    document.body.removeChild(textarea);
  }

  function generateExecutableCode(data, origin) {
    return `
// 会话存储数据导入脚本 - 来自 ${origin}
// 在目标网站的开发者工具控制台中粘贴并执行此代码
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

  function executeCode(data, origin) {
    const code = `
      (function() {
        try {
          const data = ${JSON.stringify(data)};
          Object.entries(data).forEach(([key, value]) => {
            try {
              sessionStorage.setItem(key, value);
              console.log('✅ 成功设置:', key);
            } catch(e) {
              console.error('❌ 设置失败:', key, e);
            }
          });
          console.log('🎉 导入完成！共导入 ' + Object.keys(data).length + ' 个项目');
        } catch(e) {
          console.error('❌ 执行失败:', e);
        }
      })();
    `;

    chrome.devtools.inspectedWindow.eval(code, (result, exceptionInfo) => {
      if (exceptionInfo) {
        console.error("执行失败:", exceptionInfo);
        showStatus("执行失败: " + exceptionInfo.value, true);
        return;
      }
      showStatus("成功导入数据到 " + origin);
    });
  }

  function createStorageSection(origin, data) {
    const section = document.createElement("div");
    section.className = "storage-section";
    section.style.marginBottom = "30px";
    section.style.backgroundColor = "#fff";
    section.style.borderRadius = "8px";
    section.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
    section.style.overflow = "hidden";

    // 创建源信息头部
    const header = document.createElement("div");
    header.style.padding = "15px";
    header.style.backgroundColor = "#e3f2fd";
    header.style.borderBottom = "1px solid #bbdefb";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";

    const originText = document.createElement("div");
    originText.textContent = "源: " + origin;
    originText.style.fontWeight = "bold";
    originText.style.color = "#1976D2";

    const copyAllButton = document.createElement("button");
    copyAllButton.textContent = "复制此源所有数据";
    copyAllButton.onclick = () => {
      copyToClipboard(generateExecutableCode(data, origin));
    };

    const executeAllButton = document.createElement("button");
    executeAllButton.textContent = "导入此源所有数据";
    executeAllButton.style.marginLeft = "5px";
    executeAllButton.style.backgroundColor = "#4CAF50";
    executeAllButton.onclick = () => {
      executeCode(data, origin);
    };

    header.appendChild(originText);
    header.appendChild(copyAllButton);
    header.appendChild(executeAllButton);
    section.appendChild(header);

    // 创建数据内容区域
    const content = document.createElement("div");
    content.style.padding = "15px";

    if (Object.keys(data).length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.style.padding = "10px";
      emptyMsg.style.color = "#666";
      emptyMsg.textContent = "此源没有会话存储数据";
      content.appendChild(emptyMsg);
    } else {
      Object.entries(data).forEach(([key, value]) => {
        const item = document.createElement("div");
        item.style.margin = "10px 0";
        item.style.padding = "10px";
        item.style.border = "1px solid #ddd";
        item.style.borderRadius = "4px";
        item.style.backgroundColor = "#f8f8f8";

        const keySpan = document.createElement("span");
        keySpan.textContent = key;
        keySpan.style.fontWeight = "bold";
        keySpan.style.color = "#2196F3";

        const valueSpan = document.createElement("span");
        valueSpan.textContent = ": " + value;

        const copyKeyButton = document.createElement("button");
        copyKeyButton.textContent = "复制键名";
        copyKeyButton.style.float = "right";
        copyKeyButton.style.marginLeft = "5px";
        copyKeyButton.onclick = () => {
          copyToClipboard(key);
        };

        const copyValueButton = document.createElement("button");
        copyValueButton.textContent = "复制值";
        copyValueButton.style.float = "right";
        copyValueButton.style.marginLeft = "5px";
        copyValueButton.onclick = () => {
          copyToClipboard(value);
        };

        const copyBothButton = document.createElement("button");
        copyBothButton.textContent = "复制为代码";
        copyBothButton.style.float = "right";
        copyBothButton.onclick = () => {
          const singleItemData = { [key]: value };
          copyToClipboard(generateExecutableCode(singleItemData, origin));
        };

        const executeButton = document.createElement("button");
        executeButton.textContent = "直接导入";
        executeButton.style.float = "right";
        executeButton.style.marginRight = "5px";
        executeButton.style.backgroundColor = "#4CAF50";
        executeButton.onclick = () => {
          const singleItemData = { [key]: value };
          executeCode(singleItemData, origin);
        };

        item.appendChild(keySpan);
        item.appendChild(valueSpan);
        item.appendChild(copyKeyButton);
        item.appendChild(copyValueButton);
        item.appendChild(copyBothButton);
        item.appendChild(executeButton);
        content.appendChild(item);
      });
    }

    section.appendChild(content);
    return section;
  }

  function refreshStorageData() {
    console.log("Refreshing storage data...");

    // 创建要注入到iframe的脚本
    const iframeScript = `
      (function() {
        try {
          console.log("Running in iframe context");
          console.log("Current URL:", window.location.href);
          console.log("Current origin:", window.location.origin);
          
          // 尝试访问sessionStorage
          console.log("SessionStorage available:", !!window.sessionStorage);
          console.log("SessionStorage length:", window.sessionStorage ? window.sessionStorage.length : 0);
          
          const data = {};
          const storage = window.sessionStorage;
          
          if (storage) {
            // 列出所有的键
            const keys = [];
            for (let i = 0; i < storage.length; i++) {
              keys.push(storage.key(i));
            }
            console.log("Available keys:", keys);
            
            // 获取所有值
            for (let i = 0; i < storage.length; i++) {
              const key = storage.key(i);
              try {
                data[key] = storage.getItem(key);
                console.log("Got value for key:", key);
              } catch (e) {
                console.error("Error getting value for key:", key, e);
              }
            }
          }
          
          const result = {
            origin: window.location.origin,
            href: window.location.href,
            data: data
          };
          console.log("Returning result:", result);
          return result;
        } catch(e) {
          console.error("Error in iframe script:", e);
          return {
            error: e.message,
            origin: window.location.origin,
            href: window.location.href,
            data: {}
          };
        }
      })()
    `;

    // 主要的检查脚本
    const mainScript = `
      (function() {
        try {
          console.log("Starting data collection...");
          
          // 获取所有iframe
          const frames = Array.from(document.getElementsByTagName('iframe'));
          console.log("Found frames:", frames.length);
          frames.forEach(frame => console.log("Frame src:", frame.src));
          
          // 获取主页面的存储数据
          console.log("Getting main page storage...");
          const mainStorage = {
            origin: window.location.origin,
            href: window.location.href,
            data: {}
          };
          
          try {
            console.log("SessionStorage available in main page:", !!window.sessionStorage);
            console.log("SessionStorage length:", window.sessionStorage ? window.sessionStorage.length : 0);
            
            const storage = window.sessionStorage;
            if (storage) {
              // 列出所有的键
              const keys = [];
              for (let i = 0; i < storage.length; i++) {
                keys.push(storage.key(i));
              }
              console.log("Available keys in main page:", keys);
              
              // 获取所有值
              for (let i = 0; i < storage.length; i++) {
                const key = storage.key(i);
                try {
                  mainStorage.data[key] = storage.getItem(key);
                  console.log("Got value for key in main page:", key);
                } catch (e) {
                  console.error("Error getting value for key in main page:", key, e);
                }
              }
            }
          } catch (e) {
            console.error("Error accessing main page storage:", e);
          }
          
          console.log("Main page storage:", mainStorage);

          // 收集iframe信息
          const iframeResults = frames
            .filter(frame => frame.src)
            .map(frame => ({
              frameURL: frame.src,
              needsEvaluation: true
            }));
          
          return {
            mainStorage: mainStorage,
            iframeResults: iframeResults
          };
        } catch(e) {
          console.error("Error in main script:", e);
          return {
            mainStorage: { origin: window.location.origin, data: {} },
            iframeResults: []
          };
        }
      })()
    `;

    // 执行主脚本
    chrome.devtools.inspectedWindow.eval(
      mainScript,
      async function (result, isException) {
        if (isException) {
          console.error("Failed to get storage data:", isException);
          showStatus("获取存储数据失败: " + isException.value, true);
          return;
        }

        console.log("Got initial data:", result);

        // 处理iframe结果
        const finalResults = [];

        // 添加主页面数据（如果有）
        if (
          result &&
          result.mainStorage &&
          Object.keys(result.mainStorage.data).length > 0
        ) {
          finalResults.push(result.mainStorage);
        }

        // 处理iframe数据
        if (result && Array.isArray(result.iframeResults)) {
          // 对每个iframe执行脚本
          for (const frame of result.iframeResults) {
            try {
              const frameResult = await new Promise((resolve) => {
                chrome.devtools.inspectedWindow.eval(
                  iframeScript,
                  { frameURL: frame.frameURL },
                  (result, exceptionInfo) => {
                    if (exceptionInfo) {
                      console.error(
                        "Error executing in frame:",
                        frame.frameURL,
                        exceptionInfo
                      );
                      resolve(null);
                      return;
                    }
                    console.log(
                      "Frame result for",
                      frame.frameURL,
                      ":",
                      result
                    );
                    resolve(result);
                  }
                );
              });

              if (frameResult && Object.keys(frameResult.data).length > 0) {
                finalResults.push(frameResult);
              }
            } catch (e) {
              console.error("Error evaluating frame:", frame.frameURL, e);
            }
          }
        }

        console.log("Final results:", finalResults);
        storageList.innerHTML = "";

        if (finalResults.length === 0) {
          const noDataMsg = document.createElement("div");
          noDataMsg.style.padding = "10px";
          noDataMsg.style.color = "#666";
          noDataMsg.textContent = "没有找到任何会话存储数据";
          storageList.appendChild(noDataMsg);
          return;
        }

        // 创建一个存储所有数据的对象，用于"复制所有"功能
        const allStorageData = {};

        // 为每个源创建一个部分
        finalResults.forEach((storage) => {
          if (storage && storage.origin && storage.data) {
            console.log("Processing storage from origin:", storage.origin);
            const section = createStorageSection(storage.origin, storage.data);
            storageList.appendChild(section);

            // 将此源的数据添加到总数据中
            Object.assign(allStorageData, storage.data);
          }
        });

        if (Object.keys(allStorageData).length === 0) {
          const noDataMsg = document.createElement("div");
          noDataMsg.style.padding = "10px";
          noDataMsg.style.color = "#666";
          noDataMsg.textContent =
            "没有找到任何会话存储数据（已尝试访问所有可见的iframe）";
          storageList.appendChild(noDataMsg);
          return;
        }

        // 添加复制所有数据的按钮
        const copyAllContainer = document.createElement("div");
        copyAllContainer.style.marginTop = "20px";
        copyAllContainer.style.textAlign = "center";
        copyAllContainer.style.padding = "20px";
        copyAllContainer.style.backgroundColor = "#fff";
        copyAllContainer.style.borderRadius = "8px";
        copyAllContainer.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";

        const copyAllDataButton = document.createElement("button");
        copyAllDataButton.textContent = "复制所有源的数据为可执行代码";
        copyAllDataButton.style.padding = "10px 20px";
        copyAllDataButton.onclick = () => {
          copyToClipboard(generateExecutableCode(allStorageData, "所有源"));
        };

        const executeAllDataButton = document.createElement("button");
        executeAllDataButton.textContent = "导入所有源的数据";
        executeAllDataButton.style.padding = "10px 20px";
        executeAllDataButton.style.marginLeft = "10px";
        executeAllDataButton.style.backgroundColor = "#4CAF50";
        executeAllDataButton.onclick = () => {
          executeCode(allStorageData, "所有源");
        };

        copyAllContainer.appendChild(copyAllDataButton);
        copyAllContainer.appendChild(executeAllDataButton);
        storageList.appendChild(copyAllContainer);
      }
    );
  }

  refreshBtn.addEventListener("click", function () {
    console.log("Refresh button clicked");
    refreshStorageData();
  });

  // 初始加载数据
  console.log("Initial data load");
  refreshStorageData();
});
