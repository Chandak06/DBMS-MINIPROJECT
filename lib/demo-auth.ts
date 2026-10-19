export function demoLoginEnabled() {
 if(process.env.DEMO_LOGIN_ENABLED!=="true") return false;
 try { return ["localhost","127.0.0.1","[::1]"].includes(new URL(process.env.APP_BASE_URL||"http://localhost:3000").hostname); }
 catch { return false; }
}
