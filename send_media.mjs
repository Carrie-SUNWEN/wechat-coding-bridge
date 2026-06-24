// send_media.mjs — 发文件/图片/文字助手(微信 iLink)
// 复用 cli-wechat-bridge 包里测试过的 WeChatTransport.sendFile / sendImage / sendNotification,
// 直接读取 ~/.cli-bridge/account.json(凭据) 和 context_tokens.json(上下文token) 完成加密上传+发送。
//
// 用法:
//   node send_media.mjs status                          # 自检: 打印凭据/上下文缓存状态, 不发送
//   node send_media.mjs text  <文本内容> [收件人ID]      # 主动推送一条文字(任务通知/播报)
//   node send_media.mjs textfile <utf8文件> [收件人ID]   # 从文件读文字再推送(适合长中文)
//   node send_media.mjs file  <文件路径> [收件人ID] [显示文件名]
//   node send_media.mjs image <图片路径> [收件人ID] [配文]
// 退出码: 0=成功, 1=失败; 结果以 JSON 打到 stdout。
// 依赖: 同目录 npm install 后的 cli-wechat-bridge(见 package.json)。

import path from "node:path";

const logger = {
  log: (m) => process.stderr.write(`[media] ${m}\n`),
  logError: (m) => process.stderr.write(`[media-err] ${m}\n`),
};

function out(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

async function main() {
  const [, , action, p1, p2, p3] = process.argv;
  const mod = await import("cli-wechat-bridge/dist/wechat/wechat-transport.js");
  const Transport = mod.WeChatTransport;
  const t = new Transport(logger);

  if (action === "status") {
    out({ ok: true, status: t.getStatusText() });
    return;
  }

  if (action === "text") {
    if (!p1) {
      out({ ok: false, error: "缺少文本内容" });
      process.exit(1);
    }
    const recipientId = (p2 && p2.trim()) || undefined;
    const recipient = await t.sendNotification(p1, recipientId);
    out({ ok: true, action: "text", recipient });
    return;
  }

  if (action === "textfile") {
    // 从 UTF-8 文件读取文本内容再推送(适合含中文/换行的长摘要)
    if (!p1) {
      out({ ok: false, error: "缺少文本文件路径" });
      process.exit(1);
    }
    const fs = await import("node:fs");
    const msg = fs.readFileSync(path.resolve(p1), "utf-8").trim();
    if (!msg) {
      out({ ok: false, error: "文本文件为空" });
      process.exit(1);
    }
    const recipientId = (p2 && p2.trim()) || undefined;
    const recipient = await t.sendNotification(msg, recipientId);
    out({ ok: true, action: "textfile", recipient });
    return;
  }

  if (!p1) {
    out({ ok: false, error: "缺少文件路径参数" });
    process.exit(1);
  }
  const filePath = path.resolve(p1);
  const recipientId = (p2 && p2.trim()) || undefined; // 留空则用 context 缓存里最后一个

  let recipient;
  if (action === "image") {
    recipient = await t.sendImage(filePath, { recipientId, caption: p3 || undefined });
  } else if (action === "file") {
    recipient = await t.sendFile(filePath, { recipientId, title: p3 || undefined });
  } else {
    out({ ok: false, error: `未知动作: ${action} (应为 file|image|text|textfile|status)` });
    process.exit(1);
  }
  out({ ok: true, action, recipient, file: filePath });
}

main().catch((e) => {
  out({ ok: false, error: String(e && e.message ? e.message : e) });
  process.exit(1);
});
