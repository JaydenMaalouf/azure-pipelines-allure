import path = require("path");
import task = require("azure-pipelines-task-lib/task");
import { TaskResult, FindOptions } from "azure-pipelines-task-lib/task";
import { IExecOptions } from "azure-pipelines-task-lib/toolrunner";
import { AllureGenerator } from "./allure";
import { report } from "process";

async function run() {
  let allurePath: string;
  try {
    allurePath = task.which("allure", true);
  } catch (err) {
    throw "Allure Commandline not found.";
  }

/* This is the code that generates the report. */
  const reportDirectory = task.getPathInput("reportDirectory");
  const shouldGenerate = task.getBoolInput("generateReport");
  if (shouldGenerate) {
    const allureTool = task.tool(allurePath);
    const workingDirectory = task.getPathInput("workingDirectory");
    allureTool.arg(["generate"]);
    allureTool.argIf(workingDirectory, workingDirectory);
    allureTool.argIf(reportDirectory, ["-o", reportDirectory]);

    const result = await allureTool.exec();
    if (result != 0) {
      throw `Allure Generation failed with Exit Code: ${result}`;
    }
  }

/* This is the code that generates the report. */
  const outputDirectory = task.getPathInput("outputDirectory");
  if (outputDirectory) {
    const allureGen = new AllureGenerator(reportDirectory, outputDirectory);
    task.debug("Starting allure generation");
    const outputFile = allureGen.generate();
    console.log(`Output file generated: ${outputFile}`);
    task.addAttachment("allure.report", "index.html", outputFile);
  }

  const shouldPublish = task.getBoolInput("publishResults");
  if (shouldPublish) {
    const testReporter = task.getInput("testReporter");
    const testPublisher = new task.TestPublisher(testReporter);

    const testRunTitle = task.getInput("runTitle");
    const testResultFilesFilter = task.getInput("resultFilesFilter");
    const testResultsDirectory = task.getPathInput("testResultsDirectory");

    const findOptions = <FindOptions>{
      allowBrokenSymbolicLinks: true,
      followSpecifiedSymbolicLink: true,
      followSymbolicLinks: true,
    };
    const matchingTestResultsFiles = task.findMatch(
      testResultsDirectory,
      testResultFilesFilter,
      findOptions
    );
    testPublisher.publish(
      matchingTestResultsFiles,
      "true",
      "",
      "",
      testRunTitle,
      "true"
    );
  }
}

run()
  .then(() => {
    task.setResult(TaskResult.Succeeded, "");
  })
  .catch((error) => {
    task.setResult(TaskResult.Failed, error);
  });
