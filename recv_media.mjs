// recv_media.mjs — 接收图片/文件助手(微信 iLink)
// 输入: 一个 UTF-8 JSON 文件路径(里面是 iLink 原始消息对象, 含 item_list)。
// 复用 cli-wechat-bridge 包里 extractInboundMessageContent + WeChatTransport.downloadInboundAttachments(下载+AES解密落盘)。
// 输出(stdout JSON): { ok, text, attachments:[{kind,path,fileName,sizeBytes}], failures:[...] }
// 用法: node recv_media.mjs <原始消息json路径>
// 依赖: 同目录 npm install 后的 cli-wechat-bridge(见 package.json)。

import fs from "node:fs";

const logger = {
  log: (m) => process.stderr.write(`[recv] ${m}\n`),
  logError: (m) => process.stderr.write(`[recv-err] ${m}\n`),
};

function out(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

async function main() {
  const msgPath = process.argv[2];
  if (!msgPath) {
    out({ ok: false, error: "缺少原始消息json路径" });
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(msgPath, "utf-8"));
  const mod = await import("cli-wechat-bridge/dist/wechat/wechat-transport.js");
  const t = new mod.WeChatTransport(logger);

  const extracted = mod.extractInboundMessageContent(raw); // { text, attachments: descriptors }
  let attachments = [];
  let failures = [];
  if (extracted.attachments && extracted.attachments.length) {
    const res = await t.downloadInboundAttachments(extracted.attachments, raw);
    attachments = (res.attachments || []).map((a) => ({
      kind: a.kind,
      path: a.path,
      fileName: a.fileName,
      sizeBytes: a.sizeBytes,
    }));
    failures = res.failureLines || [];
  }
  out({ ok: true, text: extracted.text || "", attachments, failures });
}

main().catch((e) => {
  out({ ok: false, error: String(e && e.message ? e.message : e) });
  process.exit(1);
});
