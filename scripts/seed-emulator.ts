import { runSeed } from "./seed";

runSeed("emulator").catch((error) => {
  console.error(error);
  process.exit(1);
});
