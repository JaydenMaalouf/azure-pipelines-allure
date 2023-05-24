import task = require("azure-pipelines-task-lib/task");
import { TaskResult } from "azure-pipelines-task-lib/task";
import { ToolRunner } from "azure-pipelines-task-lib/toolrunner";

async function run() {
  try {
    let npmPath: string;
    try {
      npmPath = task.which("npm", true);
    } catch (err) {
      throw "NPM not found.";
    }

    const npmRunner: ToolRunner = new ToolRunner(npmPath);
    npmRunner.arg(["install", "-g", "allure-commandline"]);

    const result = await npmRunner.exec();
    if (result == 0) {
      task.setResult(TaskResult.Succeeded, "");
      return;
    }

    throw `Tool installation failed with Exit Code: ${result}`;
  } catch (error) {
    task.setResult(TaskResult.Failed, error);
  }
}

run();
