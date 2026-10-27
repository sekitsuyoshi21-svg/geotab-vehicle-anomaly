/* global geotab */
(function () {
  "use strict";

  const ADDIN_NAME = "vehicleAnomaly";
  const state = { api: null, faults: [], severity: "すべて", type: "すべて", query: "" };
  const $ = (id) => document.getElementById(id);

  const demoFaults = [
    {id:"d1",vehicle:"品川 101",severity:"重大",code:"P0301",type:"車両故障",description:"1番シリンダーの失火を検出",occurred:"2026/10/27 10:32",count:3,source:"OBD-II",lamp:"MIL",recommendation:"整備担当者による確認を推奨します。"},
    {id:"d2",vehicle:"横浜 405",severity:"警告",code:"287",type:"GOデバイス",description:"GOデバイスの取り付け状態を確認",occurred:"2026/10/27 07:55",count:4,source:"GO Device",lamp:"-",recommendation:"コネクターと固定状態を確認してください。"}
  ];

  function apiCall(method, params) {
    return new Promise((resolve, reject) => state.api.call(method, params, resolve, reject));
  }

  function safe(value, fallback) { return value === null || value === undefined || value === "" ? fallback : value; }
  function refId(value) { return value && typeof value === "object" ? value.id : value; }
  function dateText(value) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("ja-JP"); }
  function sourceName(diagnostic) { return safe(diagnostic && diagnostic.source && diagnostic.source.name, safe(diagnostic && diagnostic.diagnosticType, "不明")); }
  function classifyType(source) { const s=String(source).toLowerCase(); if(s.includes("go")) return "GOデバイス"; if(s.includes("obd")||s.includes("spn")||s.includes("sid")||s.includes("proprietary")) return "車両故障"; if(s.includes("network")||s.includes("communication")||s.includes("can")) return "通信"; return "その他"; }
  function classifySeverity(f) {
    const sev=String(safe(f.severity && (f.severity.name || f.severity), "")).toLowerCase();
    if(f.redStopLamp || sev.includes("critical") || sev.includes("high") || sev.includes("severe")) return "重大";
    if(f.amberWarningLamp || f.malfunctionLamp || f.protectWarningLamp || sev.includes("medium") || sev.includes("warning")) return "警告";
    return "情報";
  }

  async function loadFaults() {
    setStatus("Geotabから異常データを取得しています...");
    const days=Number($("periodFilter").value || 7);
    const from=new Date(Date.now()-days*86400000).toISOString();
    try {
      const [faultData, devices, diagnostics] = await Promise.all([
        apiCall("Get", {typeName:"FaultData", search:{fromDate:from}, resultsLimit:5000}),
        apiCall("Get", {typeName:"Device", resultsLimit:5000}),
        apiCall("Get", {typeName:"Diagnostic", resultsLimit:5000})
      ]);
      const deviceMap=new Map(devices.map(x=>[x.id, x.name || x.serialNumber || x.id]));
      const diagnosticMap=new Map(diagnostics.map(x=>[x.id, x]));
      state.faults=faultData.map((f,index)=>{
        const diagnostic=diagnosticMap.get(refId(f.diagnostic)) || (typeof f.diagnostic === "object" ? f.diagnostic : {});
        const source=sourceName(diagnostic);
        const code=safe(diagnostic.code, safe(diagnostic.name, "不明"));
        return {id:f.id || String(index), vehicle:safe(deviceMap.get(refId(f.device)), "車両名不明"), severity:classifySeverity(f), code:String(code), type:classifyType(source), description:safe(f.faultDescription, safe(diagnostic.name, "説明なし")), occurred:dateText(f.dateTime), count:safe(f.count,1), source:source, lamp:f.redStopLamp?"Red Stop":(f.amberWarningLamp?"Amber":(f.malfunctionLamp?"MIL":"-")), recommendation:safe(f.recommendation,"整備担当者による確認を推奨します。")};
      });
      setStatus(`${state.faults.length}件の異常を取得しました。`);
      $("lastUpdated").textContent=`最終更新 ${new Date().toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"})}`;
      render();
    } catch (error) {
      console.error(error);
      state.faults=[];
      setStatus("データを取得できませんでした。MyGeotab権限、Add-In設定、API応答を確認してください。", true);
      render();
    }
  }

  function setStatus(text,isError){ $("statusMessage").textContent=text; $("statusMessage").classList.toggle("error",!!isError); }
  function escapeHtml(value){ return String(value).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
  function badgeClass(s){ return s==="重大"?"badge-critical":s==="警告"?"badge-warning":"badge-info"; }

  function render(){
    const filtered=state.faults.filter(f=>(state.severity==="すべて"||f.severity===state.severity)&&(state.type==="すべて"||f.type===state.type)&&(!state.query||`${f.vehicle} ${f.code} ${f.description}`.toLowerCase().includes(state.query.toLowerCase())));
    $("criticalCount").textContent=state.faults.filter(f=>f.severity==="重大").length;
    $("warningCount").textContent=state.faults.filter(f=>f.severity==="警告").length;
    $("infoCount").textContent=state.faults.filter(f=>f.severity==="情報").length;
    $("totalCount").textContent=state.faults.length;
    $("faultTableBody").innerHTML=filtered.map(f=>`<tr data-id="${escapeHtml(f.id)}"><td class="vehicle">${escapeHtml(f.vehicle)}</td><td><span class="badge ${badgeClass(f.severity)}">${escapeHtml(f.severity)}</span></td><td class="code">${escapeHtml(f.code)}</td><td>${escapeHtml(f.description)}</td><td><span class="type">${escapeHtml(f.type)}</span></td><td>${escapeHtml(f.occurred)}</td><td>${escapeHtml(f.count)}</td><td>›</td></tr>`).join("");
    $("emptyState").hidden=filtered.length>0;
    document.querySelectorAll("#faultTableBody tr").forEach(row=>row.addEventListener("click",()=>openDrawer(state.faults.find(f=>f.id===row.dataset.id))));
    document.querySelectorAll(".summary-card").forEach(x=>x.classList.toggle("active",x.dataset.severity===state.severity));
  }

  function openDrawer(f){ if(!f)return; $("drawerTitle").textContent=f.vehicle; $("drawerStatus").innerHTML=`<h3>${escapeHtml(f.severity)}　<span class="code">${escapeHtml(f.code)}</span></h3><div>${escapeHtml(f.description)}</div>`; $("detailSource").textContent=f.source; $("detailCount").textContent=`${f.count}回`; $("detailOccurred").textContent=f.occurred; $("detailLamp").textContent=f.lamp; $("detailRecommendation").textContent=f.recommendation; $("drawerBackdrop").hidden=false; $("detailDrawer").classList.add("open"); $("detailDrawer").setAttribute("aria-hidden","false"); }
  function closeDrawer(){ $("drawerBackdrop").hidden=true; $("detailDrawer").classList.remove("open"); $("detailDrawer").setAttribute("aria-hidden","true"); }
  function bindEvents(){
    $("refreshButton").addEventListener("click",loadFaults); $("periodFilter").addEventListener("change",loadFaults);
    $("searchInput").addEventListener("input",e=>{state.query=e.target.value;render();});
    $("severityFilter").addEventListener("change",e=>{state.severity=e.target.value;render();});
    $("typeFilter").addEventListener("change",e=>{state.type=e.target.value;render();});
    $("resetButton").addEventListener("click",()=>{state.severity="すべて";state.type="すべて";state.query="";$("severityFilter").value="すべて";$("typeFilter").value="すべて";$("searchInput").value="";render();});
    document.querySelectorAll(".summary-card").forEach(x=>x.addEventListener("click",()=>{state.severity=x.dataset.severity;$("severityFilter").value=state.severity;render();}));
    $("closeDrawer").addEventListener("click",closeDrawer); $("drawerBackdrop").addEventListener("click",closeDrawer);
  }

  function start(api){ state.api=api; bindEvents(); loadFaults(); }

  if (window.geotab) {
    geotab.addin[ADDIN_NAME] = function (api) {
      return { initialize: function (_api, _state, callback) { start(api); callback(); }, focus: function (apiArg, _state, callback) { state.api=apiArg||api; loadFaults().finally(callback); }, blur: function () { closeDrawer(); } };
    };
  } else {
    window.addEventListener("DOMContentLoaded",()=>{ bindEvents(); state.faults=demoFaults; setStatus("プレビューモード：サンプルデータを表示しています。"); render(); });
  }
})();