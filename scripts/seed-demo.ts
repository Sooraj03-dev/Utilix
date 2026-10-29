import { runSeed } from "./seed";

runSeed("demo").catch((error) => {
  console.error(error);
  process.exit(1);
});
