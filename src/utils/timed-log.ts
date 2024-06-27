export function timedLog(message: string) {
  const nowTime = new Date();
  console.log(`[${nowTime.toISOString()}] ${message}`)
}