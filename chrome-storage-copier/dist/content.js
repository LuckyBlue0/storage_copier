chrome.runtime.onMessage.addListener(((e,o,s)=>{if(console.log("Content script received message:",e),"getSessionStorage"===e.action){const e={};try{for(let o=0;o<sessionStorage.length;o++){const s=sessionStorage.key(o);e[s]=sessionStorage.getItem(s)}console.log("✅ 成功收集sessionStorage数据:",Object.keys(e).length,"个项目"),chrome.runtime.sendMessage({action:"saveSessionStorage",data:e})}catch(e){console.error("❌ 收集sessionStorage数据失败:",e)}}else if("importSessionStorage"===e.action)try{const o=e.data;let s=0,t=0;Object.entries(o).forEach((([e,o])=>{try{sessionStorage.setItem(e,o),console.log("✅ 成功设置:",e),s++}catch(o){console.error("❌ 设置失败:",e,o),t++}})),console.log(`🎉 导入完成！成功: ${s} 个，失败: ${t} 个`)}catch(e){console.error("❌ 导入失败:",e)}else"savingComplete"===e.action&&e.success&&console.log("✅ 数据已成功保存到扩展存储中");return s({received:!0}),!0}));