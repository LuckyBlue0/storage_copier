(()=>{async function e(){console.log("🚀 getSessionStorageData 开始执行");const e={},o=window.location.href;console.log(`🔍 当前frame URL: ${o}`);try{if("undefined"==typeof sessionStorage)return void console.error("❌ sessionStorage 不可用");console.log(`📊 sessionStorage.length = ${sessionStorage.length}`);for(let o=0;o<sessionStorage.length;o++){const t=sessionStorage.key(o);e[t]=sessionStorage.getItem(t)}if(console.log("📦 收集到的数据:",e),Object.keys(e).length>0){console.log(`✅ 成功收集 ${o} 的数据:`,Object.keys(e).length,"个项目");try{console.log("📤 正在发送消息到background...");const t=await chrome.runtime.sendMessage({action:"saveSessionStorage",data:e,frameUrl:o});console.log("📫 消息发送结果:",t)}catch(t){console.error("❌ 发送消息失败:",t);try{console.log("🔄 尝试直接保存到storage..."),await chrome.storage.local.set({[`sessionStorage_${o}`]:e}),console.log("✅ 直接保存成功")}catch(e){console.error("❌ 直接保存也失败:",e)}}}else console.log(`ℹ️ ${o} 没有sessionStorage数据`)}catch(e){console.error("❌ 收集数据失败:",e)}}async function o(e){console.log("🚀 importSessionStorageData 开始执行");const o=window.location.href;console.log(`🔍 当前frame URL: ${o}`),console.log("📦 收到的数据:",e);try{if("undefined"==typeof sessionStorage)return void console.error("❌ sessionStorage 不可用");let o={};if(Object.values(e).forEach((e=>{Object.entries(e).forEach((([e,t])=>{o[e]=t}))})),0===Object.keys(o).length)return void console.log("⚠️ 没有找到任何可导入的数据");console.log("📥 准备导入的合并数据:",o),console.log("🗑️ 清空当前sessionStorage"),sessionStorage.clear();let t=0,s=0;for(const[e,n]of Object.entries(o))try{sessionStorage.setItem(e,n),console.log(`✅ 成功导入: ${e} = ${n}`),t++}catch(o){console.error(`❌ 导入失败: ${e}`,o),s++}console.log(`🎉 导入完成！成功: ${t} 个，失败: ${s} 个`);const n={};for(let e=0;e<sessionStorage.length;e++){const o=sessionStorage.key(e);n[o]=sessionStorage.getItem(o)}console.log("📊 导入后的sessionStorage内容:",n)}catch(e){console.error("❌ 导入过程中发生错误:",e)}}chrome.runtime.onInstalled.addListener((()=>{chrome.contextMenus.create({id:"copySessionStorage",title:"复制会话存储数据",contexts:["page","frame"]}),chrome.contextMenus.create({id:"importSessionStorage",title:"导入会话存储数据",contexts:["page","frame"]})})),chrome.commands.onCommand.addListener((t=>{console.log("Command received:",t),"copy-session-storage"===t?(console.log("🎯 通过快捷键触发复制操作"),chrome.tabs.query({active:!0,currentWindow:!0},(async function(o){o[0]?(await chrome.scripting.executeScript({target:{tabId:o[0].id,allFrames:!0},function:e}),await s("数据复制成功！","success")):console.error("❌ 没有找到活动标签页")}))):"import-session-storage"===t&&(console.log("🎯 通过快捷键触发导入操作"),chrome.tabs.query({active:!0,currentWindow:!0},(async function(e){e[0]?chrome.storage.local.get(null,(async function(t){console.log("📦 storage中的所有数据:",t);const n={};if(Object.entries(t).forEach((([e,o])=>{if("sessionStorageData"===e)Object.assign(n,o);else if(e.startsWith("sessionStorage_")){const t=e.replace("sessionStorage_","");n[t]=o}})),Object.keys(n).length>0){console.log("📦 准备导入的数据:",n);try{const t=await chrome.scripting.executeScript({target:{tabId:e[0].id,allFrames:!0},function:o,args:[n]});console.log("📊 导入脚本执行结果:",t),await s("数据导入成功！","success")}catch(e){console.error("❌ 执行导入脚本失败:",e),await s("导入失败，请查看控制台了解详情","error")}}else console.log("⚠️ 没有找到要导入的数据"),await s("没有找到可导入的数据","error")})):console.error("❌ 没有找到活动标签页")})))}));let t={};async function s(e,o){const t=await chrome.tabs.query({active:!0,currentWindow:!0});t[0]&&await chrome.scripting.executeScript({target:{tabId:t[0].id,allFrames:!0},function:(e,o)=>{function t(e,o){const t=document.getElementById("chrome-storage-copier-toast");t&&t.remove();const s=document.createElement("div");s.id="chrome-storage-copier-toast",s.style.cssText=`\n            position: fixed;\n            left: 50%;\n            top: 50%;\n            transform: translate(-50%, -50%) scale(0.8);\n            padding: 12px 20px;\n            min-width: 160px;\n            max-width: 60%;\n            background-color: ${"success"===o?"#4caf50":"error"===o?"#f44336":"#2196f3"};\n            color: white;\n            border-radius: 6px;\n            box-shadow: 0 4px 12px rgba(0,0,0,0.15);\n            z-index: 10000;\n            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;\n            font-size: 14px;\n            text-align: center;\n            opacity: 0;\n            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);\n          `;const n=document.createElement("div");n.style.cssText="\n            font-size: 20px;\n            margin-bottom: 4px;\n          ",n.textContent="success"===o?"✅":"error"===o?"❌":"ℹ️",s.appendChild(n);const r=document.createElement("div");r.style.cssText="\n            line-height: 1.4;\n            word-break: break-word;\n          ",r.textContent=e,s.appendChild(r),document.body.appendChild(s),requestAnimationFrame((()=>{s.style.opacity="1",s.style.transform="translate(-50%, -50%) scale(1)"})),setTimeout((()=>{s.style.opacity="0",s.style.transform="translate(-50%, -50%) scale(0.8)",setTimeout((()=>{s.remove()}),300)}),3e3)}"complete"===document.readyState?t(e,o):window.addEventListener("load",(()=>{t(e,o)}))},args:[e,o]})}chrome.contextMenus.onClicked.addListener((async(n,r)=>{if("copySessionStorage"===n.menuItemId){console.log("🎯 触发复制操作"),t={};try{const o=await chrome.scripting.executeScript({target:{tabId:r.id,allFrames:!0},function:e});console.log("📊 脚本执行结果:",o)}catch(e){console.error("❌ 执行脚本失败:",e),await s("复制失败，请查看控制台了解详情","error")}}else"importSessionStorage"===n.menuItemId&&(console.log("🎯 触发导入操作"),chrome.storage.local.get(null,(async function(e){console.log("📦 storage中的所有数据:",e);const t={};if(Object.entries(e).forEach((([e,o])=>{if("sessionStorageData"===e)Object.assign(t,o);else if(e.startsWith("sessionStorage_")){const s=e.replace("sessionStorage_","");t[s]=o}})),Object.keys(t).length>0){console.log("📦 准备导入的数据:",t);try{const e=await chrome.scripting.executeScript({target:{tabId:r.id,allFrames:!0},function:o,args:[t]});console.log("📊 导入脚本执行结果:",e)}catch(e){console.error("❌ 执行导入脚本失败:",e),await s("导入失败，请查看控制台了解详情","error")}}else console.log("⚠️ 没有找到要导入的数据"),await s("没有找到可导入的数据","error")})))})),chrome.runtime.onMessage.addListener(((e,o,s)=>(console.log("📨 收到消息:",e),"saveSessionStorage"===e.action&&(console.log(`📥 收到来自 ${e.frameUrl} 的数据:`,e.data),Object.keys(e.data).length>0&&(t[e.frameUrl]=e.data,console.log("📦 当前收集的所有数据:",t),setTimeout((()=>{Object.keys(t).length>0&&(console.log("💾 正在保存所有收集的数据..."),chrome.storage.local.set({sessionStorageData:t},(function(){console.log('✅ 数据已保存！现在可以在目标页面右键选择"导入会话存储数据"'),console.log("📊 已保存的数据结构:",t),t={}})))}),500))),s({received:!0}),!0)))})();