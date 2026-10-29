import { runSeed } from "./seed";

runSeed("mock").catch((error) => {
  console.error(error);
  process.exit(1);
});
