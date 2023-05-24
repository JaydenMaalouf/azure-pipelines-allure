import * as SDK from "azure-devops-extension-sdk";
import { Attachment, Build, BuildRestClient, BuildStatus } from "azure-devops-extension-api/Build";
import { getClient } from "azure-devops-extension-api";

SDK.init();
SDK.ready().then(() => {
  try {
    const config = SDK.getConfiguration();
    if (typeof config.onBuildChanged === "function") {
      config.onBuildChanged(async (build: Build) => {
        if (build.status == BuildStatus.InProgress) {
          document.getElementById("spinner").style.display = "none";
          document.getElementById("progress-message").innerText = "Pipeline in progress, please wait until it's complete.";
        } else {
          document.getElementById("progress-message").innerText = "Fetching Allure Report..";
          let buildAttachmentClient = new BuildAttachmentClient(build);
          buildAttachmentClient
            .init()
            .then(() => {
              displayReports(buildAttachmentClient);
            })
            .catch((error) => {
              console.log(error);
            });
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
});

function displayReports(attachmentClient: BuildAttachmentClient) {
  let attachments = attachmentClient.fetchAttachments();
  let indexAttachment = attachments.find((x) => x.name == "index.html");
  if (indexAttachment) {
    attachmentClient.downloadAttachment(indexAttachment).then((content) => {
      var newDoc = document.open("text/html", "replace");
      newDoc.write(content);
      newDoc.close();
    });
  } else {
    document.getElementById("progress-message").innerText = "Failed to fetch report.";
  }
}

class BuildAttachmentClient {
  private build: Build;
  private authHeaders: Object = undefined;
  public attachments: Attachment[] = undefined;

  constructor(build: Build) {
    this.build = build;
  }

  public async init() {
    this.attachments = await this.getAttachments();
  }

  private async getAttachments() {
    console.log("Get attachment list");
    const buildClient: BuildRestClient = getClient(BuildRestClient);
    return await buildClient.getAttachments(
      this.build.project.id,
      this.build.id,
      "allure.report"
    );
  }

  public fetchAttachments() {
    if (this.attachments == undefined) {
      this.getAttachments().then((attachments) => {
        this.attachments = attachments;
      });
    }

    return this.attachments;
  }

  private async getAuthHeaders(): Promise<Object> {
    if (this.authHeaders === undefined) {
      console.log("Get access token");
      const accessToken = await SDK.getAccessToken();
      const b64encodedAuth = Buffer.from(":" + accessToken).toString("base64");
      this.authHeaders = {
        headers: { Authorization: "Basic " + b64encodedAuth },
      };
    }
    return this.authHeaders;
  }

  public async downloadAttachment(attachment: Attachment): Promise<string> {
    const headers = await this.getAuthHeaders();
    console.log("downloading:");
    console.log(attachment);
    const response = await fetch(attachment._links.self.href, headers);
    if (!response.ok) {
      throw new Error(response.statusText);
    }

    console.log("repsonse");
    console.log(response);
    return await response.text();
  }
}
