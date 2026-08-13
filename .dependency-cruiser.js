/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "domains-must-stay-pure",
      severity: "error",
      comment: "domains ต้องไม่ import modules/infrastructure/libs — core ต้อง pure",
      from: { path: "^server/src/domains" },
      to: { path: "^(server/src/modules|server/src/infrastructure|server/src/libs)" },
    },
    {
      name: "infra-not-touch-app-layer",
      severity: "error",
      comment: "infrastructure ต้องไม่ import modules (application layer)",
      from: { path: "^server/src/infrastructure" },
      to: { path: "^server/src/modules" },
    },
    {
      name: "app-not-import-server",
      severity: "error",
      comment:
        "frontend ผ่าน API/proxy เท่านั้น — ห้าม import server internals (ยกเว้น shared.ts + server app type สำหรับ Eden treaty)",
      from: { path: "^app" },
      to: {
        path: "^server/src",
        pathNot: "^server/src/(shared\\.ts|app\\.ts)$",
      },
    },
    {
      name: "app-not-import-server-alias",
      severity: "error",
      comment: "ปิดช่องโหว่ alias @/server/* (resolve เป็น server/*)",
      from: { path: "^app" },
      to: { path: "^server", pathNot: "^server/src/(shared\\.ts|app\\.ts)$" },
    },
    {
      name: "features-not-cross-import",
      severity: "error",
      comment:
        "features ต้องไม่ import ข้ามกัน — แชร์ผ่าน app/_shared เท่านั้น (ยกเว้น allowlist: search ใช้ catalog ebookๆ)",
      from: { path: "^app/features/([^/]+)/" },
      to: {
        path: "^app/features/[^/]+/",
        pathNot:
          "^app/features/$1/|^app/_shared|^app/features/catalog/actions/catalog\\.action\\.ts$|^app/features/catalog/catalog\\.types\\.ts$",
      },
    },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    doNotFollow: { path: "node_modules" },
    exclude: {
      path: "(\\.test\\.ts$|\\.spec\\.ts$|_tailadmin_ref|\\.superpowers|\\.next|dist|coverage|e2e)",
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
