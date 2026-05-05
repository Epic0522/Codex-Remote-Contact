const els = {
  overallStatus: document.querySelector("#overallStatus"),
  qqToggle: document.querySelector("#qqToggle"),
  imessageToggle: document.querySelector("#imessageToggle"),
  maintenanceGrid: document.querySelector("#maintenanceGrid"),
  refreshMaintenance: document.querySelector("#refreshMaintenance"),
  imessageStatus: document.querySelector("#imessageStatus"),
  imessageError: document.querySelector("#imessageError"),
  imessageEvents: document.querySelector("#imessageEvents"),
  trustedHandlesList: document.querySelector("#trustedHandlesList"),
  trustedHandleInput: document.querySelector("#trustedHandleInput"),
  addTrustedHandle: document.querySelector("#addTrustedHandle"),
  trustedHandleCount: document.querySelector("#trustedHandleCount"),
  replyHandleInput: document.querySelector("#replyHandleInput"),
  saveReplyHandle: document.querySelector("#saveReplyHandle"),
  allowedGroupsList: document.querySelector("#allowedGroupsList"),
  allowedGroupInput: document.querySelector("#allowedGroupInput"),
  addGroup: document.querySelector("#addGroup"),
  groupCount: document.querySelector("#groupCount"),
  clearMemory: document.querySelector("#clearMemory"),
  memoryStats: document.querySelector("#memoryStats"),
  groupId: document.querySelector("#groupId"),
  senderName: document.querySelector("#senderName"),
  messageText: document.querySelector("#messageText"),
  sendMention: document.querySelector("#sendMention"),
  sendNormal: document.querySelector("#sendNormal"),
  events: document.querySelector("#events")
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function render(state) {
  els.qqToggle.checked = state.channels.qq;
  els.imessageToggle.checked = state.channels.imessage;
  renderAllowedGroups(state.qq.allowedGroups);
  renderMemoryStats(state.qq.memory);
  renderIMessage(state.imessage);

  const online = state.channels.qq || state.channels.imessage;
  els.overallStatus.textContent = online ? "在线" : "离线";
  els.overallStatus.classList.toggle("online", online);

  els.events.innerHTML = state.qq.events.length
    ? state.qq.events.map(renderEvent).join("")
    : '<p class="empty">还没有事件。先打开 QQ 开关，再发一个模拟 @。</p>';
}

function renderMaintenance(health) {
  if (!health) return;
  const cards = [
    {
      title: "LLBot / OneBot",
      ok: health.oneBot?.ok,
      lines: [
        `API: ${health.oneBot?.ok ? "在线" : "离线"}`,
        health.oneBot?.nickname ? `账号: ${health.oneBot.nickname}` : null,
        health.oneBot?.selfId ? `QQ: ${health.oneBot.selfId}` : null,
        health.oneBot?.lastError ? `错误: ${health.oneBot.lastError}` : null
      ]
    },
    {
      title: "Codex CLI",
      ok: health.codex?.pathExists && health.codex?.lastOk !== false,
      lines: [
        `路径: ${health.codex?.pathExists ? "存在" : "缺失"}`,
        health.codex?.lastRunAt ? `上次运行: ${formatTime(health.codex.lastRunAt)}` : "还没有运行",
        health.codex?.lastDurationMs != null ? `耗时: ${health.codex.lastDurationMs} ms` : null,
        health.codex?.lastError ? `错误: ${health.codex.lastError}` : null
      ],
      detailHtml: renderCodexQuotaBlock(health.codex?.quota)
    },
    {
      title: "iMessage",
      ok: health.channels?.imessage && health.imessage?.status !== "error",
      lines: [
        `开关: ${health.channels?.imessage ? "开启" : "关闭"}`,
        `状态: ${health.imessage?.status || "idle"}`,
        `可信联系人: ${health.imessage?.trustedHandles ?? 0} 个`,
        health.imessage?.lastError ? `错误: ${health.imessage.lastError}` : null
      ]
    },
    {
      title: "远程执行模式",
      ok: Boolean(health.remoteExecution?.enabled),
      lines: [
        `状态: ${health.remoteExecution?.enabled ? "开启" : "关闭"}`,
        `模型: ${health.remoteExecution?.model || "未知"}`,
        `智能: ${health.remoteExecution?.reasoningEffort || "未知"}`,
        `记忆: ${health.remoteExecution?.memoryCount ?? 0} 条`,
        health.remoteExecution?.busy ? "Codex 运行中" : null
      ]
    },
    {
      title: "QQ",
      ok: health.channels?.qq,
      lines: [
        `开关: ${health.channels?.qq ? "开启" : "关闭"}`,
        `白名单: ${health.qq?.allowedGroups ?? 0} 个群`,
        `记忆: ${health.qq?.memoryGroups ?? 0} 个群`,
        `事件: ${health.qq?.recentEvents ?? 0} 条`
      ]
    },
    {
      title: "联网查询",
      ok: health.webLookup?.enabled && health.webLookup?.lastOk !== false,
      lines: [
        `开关: ${health.webLookup?.enabled ? "开启" : "关闭"}`,
        health.webLookup?.lastQuery ? `上次查询: ${health.webLookup.lastQuery}` : "还没有查询",
        health.webLookup?.lastDurationMs != null ? `耗时: ${health.webLookup.lastDurationMs} ms` : null,
        health.webLookup?.lastError ? `错误: ${health.webLookup.lastError}` : null
      ]
    }
  ];

  els.maintenanceGrid.innerHTML = cards.map((card) => `
    <article class="health-card ${card.ok ? "ok" : "warn"}">
      <div class="health-title">
        <strong>${escapeHtml(card.title)}</strong>
        <span>${card.ok ? "正常" : "注意"}</span>
      </div>
      ${card.lines.filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
      ${card.detailHtml || ""}
    </article>
  `).join("");
}

function renderCodexQuotaBlock(quota) {
  if (!quota?.available) return "";
  const rows = [
    renderQuotaRow("5 小时", quota.primary),
    renderQuotaRow("7 天", quota.secondary)
  ].filter(Boolean).join("");
  const summary = quota.totalTokens != null && quota.modelContextWindow != null
    ? `<p class="quota-summary">已使用 ${escapeHtml(formatTokenNumber(quota.totalTokens))} / 共 ${escapeHtml(formatContextWindow(quota.modelContextWindow))}</p>`
    : "";
  const updated = quota.updatedAt
    ? `<p class="quota-updated">记录 ${escapeHtml(formatTime(quota.updatedAt))}</p>`
    : "";
  return rows || summary ? `<div class="quota-block">${summary}${rows}${updated}</div>` : "";
}

function renderQuotaRow(label, window) {
  if (!window) return "";
  return `
    <div class="quota-row">
      <div class="quota-meta">
        <strong>${escapeHtml(label)}</strong>
        <span>剩余 ${escapeHtml(formatPercent(window.remainingPercent))} · 重置 ${escapeHtml(formatResetTime(window.resetsAt))}</span>
      </div>
      <div class="quota-track" aria-hidden="true">
        <span class="quota-fill" style="width: ${escapeHtml(formatPercent(window.remainingPercent))}"></span>
      </div>
    </div>
  `;
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString();
}

function formatResetTime(epochSeconds) {
  const date = new Date(Number(epochSeconds) * 1000);
  if (Number.isNaN(date.getTime())) return "--";
  const now = new Date();
  const sameDate = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
  return sameDate
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function formatPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0%";
  return `${Math.max(0, Math.min(100, Math.round(numeric)))}%`;
}

function formatTokenNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  return Math.round(numeric).toLocaleString("en-US");
}

function formatContextWindow(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  if (numeric >= 1000) return `${Math.round(numeric / 1000)}K`;
  return `${Math.round(numeric)}`;
}

function renderAllowedGroups(groups) {
  els.groupCount.textContent = `${groups.length} 个群`;
  els.allowedGroupsList.innerHTML = groups.length
    ? groups.map((groupId) => `
      <div class="group-item">
        <code>${escapeHtml(groupId)}</code>
        <button class="icon-button" data-remove-group="${escapeHtml(groupId)}" title="移除群 ${escapeHtml(groupId)}" aria-label="移除群 ${escapeHtml(groupId)}">&times;</button>
      </div>
    `).join("")
    : '<p class="empty inline">还没有白名单群。</p>';
}

function renderMemoryStats(memory) {
  const counts = memory?.groupCounts || {};
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  els.memoryStats.innerHTML = entries.length
    ? entries.map(([groupId, count]) => `
      <span class="memory-chip">
        <code>${escapeHtml(groupId)}</code>
        ${escapeHtml(count)} / ${escapeHtml(memory.perGroupLimit || 10)}
      </span>
    `).join("")
    : '<span class="memory-chip muted">暂无参与记忆</span>';
}

function renderIMessage(imessage) {
  const trustedHandles = imessage?.trustedHandles || [];
  els.imessageStatus.textContent = imessage?.status || "idle";
  els.imessageError.textContent = imessage?.lastError || "";
  els.replyHandleInput.value = imessage?.replyHandle || "";
  els.trustedHandleCount.textContent = `${trustedHandles.length} 个`;
  els.trustedHandlesList.innerHTML = trustedHandles.length
    ? trustedHandles.map((handle) => `
      <div class="group-item">
        <code>${escapeHtml(handle)}</code>
        <button class="icon-button" data-remove-handle="${escapeHtml(handle)}" title="移除 ${escapeHtml(handle)}" aria-label="移除 ${escapeHtml(handle)}">&times;</button>
      </div>
    `).join("")
    : '<p class="empty inline">还没有可信联系人。</p>';
  els.imessageEvents.innerHTML = imessage?.events?.length
    ? imessage.events.map(renderIMessageEvent).join("")
    : '<p class="empty">还没有 iMessage 命令。</p>';
}

function renderIMessageEvent(record) {
  const className = record.result?.ok ? "ok" : "skip";
  const trustedBadge = record.trusted ? "可信" : "未授权";
  const reply = record.reply ? `<p><strong>回复：</strong>${escapeHtml(record.reply)}</p>` : "";
  const send = record.send ? ` · 发送${record.send.ok ? "成功" : "失败"}` : "";
  const attachments = record.event?.attachments?.length
    ? `<p><strong>附件：</strong>${record.event.attachments.map((item) => `${escapeHtml(item.transferName || item.filename || "附件")} ${item.exists ? "" : "（未下载）"}`).join("、")}</p>`
    : "";
  return `
    <article class="event ${className}">
      <div class="meta">${new Date(record.receivedAt).toLocaleString()} · ${trustedBadge}${send} · ${escapeHtml(record.result?.summary || "")}</div>
      <p><strong>${escapeHtml(record.event?.handle || "未知")}：</strong>${escapeHtml(record.event?.text || "")}</p>
      ${attachments}
      ${reply}
    </article>
  `;
}

function renderEvent(record) {
  const status = record.decision.ok ? "回复" : "忽略";
  const className = record.decision.ok ? "ok" : "skip";
  const reply = record.reply ? `<p><strong>回复：</strong>${escapeHtml(record.reply)}</p>` : "";
  const sender = record.event.senderLabel || record.event.senderName || "未知群友";
  const ownerBadge = record.event.isOwner ? " · 你的账号" : "";
  const quoted = renderQuotedContext(record.event);
  return `
    <article class="event ${className}">
      <div class="meta">${new Date(record.receivedAt).toLocaleString()} · ${status} · ${escapeHtml(record.decision.reason || "matched")}</div>
      <p><strong>${escapeHtml(sender)}：</strong>${escapeHtml(record.event.text || "")}<span class="owner-badge">${ownerBadge}</span></p>
      ${quoted}
      ${reply}
    </article>
  `;
}

function renderQuotedContext(event) {
  if (event.replyContext) {
    const context = event.replyContext;
    const label = context.isSelf ? "回复 assistant" : `引用 ${context.senderName || context.senderId || "群友"}`;
    return `<p class="quoted"><strong>${escapeHtml(label)}：</strong>${escapeHtml(context.text || "")}</p>`;
  }
  if (event.replyContextError) {
    return `<p class="quoted warning"><strong>引用读取失败：</strong>${escapeHtml(event.replyContextError)}</p>`;
  }
  return "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function refresh() {
  render(await api("/api/state"));
  await refreshMaintenance();
}

async function refreshMaintenance() {
  try {
    renderMaintenance(await api("/api/maintenance"));
  } catch (error) {
    els.maintenanceGrid.innerHTML = `
      <article class="health-card warn">
        <div class="health-title"><strong>维护状态</strong><span>注意</span></div>
        <p>${escapeHtml(error.message)}</p>
      </article>
    `;
  }
}

async function setChannel(channel, enabled) {
  render(await api("/api/channel", {
    method: "POST",
    body: JSON.stringify({ channel, enabled })
  }));
}

async function saveAllowedGroups(allowedGroups) {
  const normalized = [...new Set(allowedGroups.map((item) => String(item).trim()).filter(Boolean))];
  render(await api("/api/qq/groups", {
    method: "POST",
    body: JSON.stringify({ allowedGroups: normalized })
  }));
}

async function saveTrustedHandles(trustedHandles) {
  const normalized = [...new Set(trustedHandles.map((item) => String(item).trim()).filter(Boolean))];
  render(await api("/api/imessage/trusted-handles", {
    method: "POST",
    body: JSON.stringify({ trustedHandles: normalized })
  }));
}

async function saveReplyHandle() {
  render(await api("/api/imessage/reply-handle", {
    method: "POST",
    body: JSON.stringify({ replyHandle: els.replyHandleInput.value.trim() })
  }));
}

async function addAllowedGroup() {
  const groupId = els.allowedGroupInput.value.trim();
  if (!groupId) return;
  const state = await api("/api/state");
  await saveAllowedGroups([...state.qq.allowedGroups, groupId]);
  els.allowedGroupInput.value = "";
}

async function addTrustedHandle() {
  const handle = els.trustedHandleInput.value.trim();
  if (!handle) return;
  const state = await api("/api/state");
  await saveTrustedHandles([...(state.imessage?.trustedHandles || []), handle]);
  els.trustedHandleInput.value = "";
}

async function sendQqEvent(type) {
  const record = await api("/api/qq/event", {
    method: "POST",
    body: JSON.stringify({
      type,
      groupId: els.groupId.value.trim(),
      senderName: els.senderName.value.trim(),
      text: els.messageText.value.trim()
    })
  });
  const state = await api("/api/state");
  render(state);
  return record;
}

els.qqToggle.addEventListener("change", () => setChannel("qq", els.qqToggle.checked));
els.imessageToggle.addEventListener("change", () => setChannel("imessage", els.imessageToggle.checked));
els.refreshMaintenance.addEventListener("click", refreshMaintenance);

els.addGroup.addEventListener("click", addAllowedGroup);
els.allowedGroupInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addAllowedGroup();
});

els.allowedGroupsList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-remove-group]");
  if (!button) return;
  const groupId = button.dataset.removeGroup;
  const state = await api("/api/state");
  await saveAllowedGroups(state.qq.allowedGroups.filter((item) => item !== groupId));
});

els.addTrustedHandle.addEventListener("click", addTrustedHandle);
els.trustedHandleInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addTrustedHandle();
});

els.saveReplyHandle.addEventListener("click", saveReplyHandle);
els.replyHandleInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") saveReplyHandle();
});

els.trustedHandlesList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-remove-handle]");
  if (!button) return;
  const handle = button.dataset.removeHandle;
  const state = await api("/api/state");
  await saveTrustedHandles((state.imessage?.trustedHandles || []).filter((item) => item !== handle));
});

els.clearMemory.addEventListener("click", async () => {
  render(await api("/api/qq/memory/clear", {
    method: "POST",
    body: JSON.stringify({})
  }));
});

els.sendMention.addEventListener("click", () => sendQqEvent("group_at"));
els.sendNormal.addEventListener("click", () => sendQqEvent("group_message"));

refresh();
