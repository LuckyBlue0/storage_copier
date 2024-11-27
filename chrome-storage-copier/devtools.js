// 创建一个新的开发者工具面板
try {
  chrome.devtools.panels.create(
    "Storage Copier", // 面板显示名称
    null, // 图标路径
    "panel.html", // 面板页面
    function (panel) {
      console.log("Storage Copier panel created successfully");
    }
  );
} catch (error) {
  console.error("Failed to create Storage Copier panel:", error);
}
