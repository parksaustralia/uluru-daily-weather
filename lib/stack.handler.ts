import { DOMParser as dom } from "xmldom";
import { Settings, DateTime } from "luxon";
import * as ftp from "basic-ftp";
import fs from "fs";
import Handlebars from "handlebars";
import sendgrid from "@sendgrid/client";
import xpath from "xpath";

import { openHours, sunrises, sunsets } from "./data";

declare var process: {
  env: {
    SENDGRID_API_KEY: string;
  };
};

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

// SendGrid has the same helper
// https://sendgrid.com/docs/for-developers/sending-email/using-handlebars/
Handlebars.registerHelper("greaterThan", function (a, b) {
  var next = arguments[arguments.length - 1];
  return a > b ? next.fn() : next.inverse();
});

Settings.defaultZoneName = "Australia/Darwin";

async function getForecast(filePath: string) {
  const client = new ftp.Client();

  try {
    await client.access({
      host: "ftp.bom.gov.au",
    });
    await client.downloadTo(filePath, "/anon/gen/fwo/IDD10201.xml");
  } catch (err) {
    console.log(err);
  }
  client.close();
}

async function readFile(path: string) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, "utf8", function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}

async function getTemplate() {
  const response = await sendgrid.request({
    method: "GET",
    url: "/v3/designs/2ae424d3-fb38-4610-a9c5-396ed535191c",
  });
  return response[1].html_content;
}

async function postSingleSend(html_content: String, formattedDate: String) {
  const response = await sendgrid.request({
    method: "POST",
    url: "/v3/marketing/singlesends",
    body: JSON.stringify({
      name: `Uluṟu-Kata Tjuṯa daily weather - ${formattedDate}`,
      send_to: {
        list_ids: ["d28c612e-a9f2-4b32-992f-5041612ed19f"],
      },
      email_config: {
        editor: "design",
        generate_plain_content: false,
        html_content,
        sender_id: 1119454,
        subject: `UKTNP weather and track forecast for ${formattedDate}`,
        suppression_group_id: 15890,
      },
    }),
  });

  return response;
}

function forecastPath(startTime: String) {
  return [
    `//product/forecast/area[@description="Yulara"]/forecast-period[`,
    `@start-time-local="${startTime}"]`,
  ].join("");
}

export async function handler() {
  const days = [1, 2].map((day) => {
    const date = DateTime.local().startOf("day").plus({ days: day });

    return {
      closing: openHours[date.month - 1][1],
      formatted: date.toFormat("d/MM/yyyy"),
      iso: date.toISO({ suppressMilliseconds: true }),
      maximum: 0,
      minimum: 0,
      opening: openHours[date.month - 1][0],
      summary: "",
      sunrise: sunrises[date.month - 1][date.day - 1],
      sunset: sunsets[date.month - 1][date.day - 1],
    };
  });

  const filePath = `/tmp/weather-${Date.now()}.xml`;

  try {
    await getForecast(filePath);
  } catch (error) {
    console.log("Failed to get BOM forecast:");
    console.log(error);
    return false;
  }

  let xml: String;

  try {
    xml = (await readFile(filePath)) as String;
  } catch (error) {
    console.log("Failed to read XML:");
    console.log(error);
    return false;
  }

  let doc: Document;

  try {
    doc = new dom().parseFromString(xml as string);
  } catch (error) {
    console.log("Failed to parse XML:");
    console.log(error);
    return false;
  }

  days.forEach((day) => {
    ["minimum" as const, "maximum" as const].forEach((tempType) => {
      const node = xpath.select(
        `${forecastPath(
          day.iso
        )}/element[@type="air_temperature_${tempType}"]/text()`,
        doc
      );
      day[tempType] = parseInt((node[0] as Node).nodeValue || "");
    });

    const node = xpath.select(
      `${forecastPath(day.iso)}/text[@type="precis"]/text()`,
      doc
    );
    day.summary = ((node[0] as Node).nodeValue || "").replace(/\.$/, "");
  });

  let template: String;
  try {
    template = await getTemplate();
  } catch (error) {
    console.log("Failed to download template:");
    console.log(error);
    return false;
  }

  let handlebars: HandlebarsTemplateDelegate;
  let htmlContent: String;

  try {
    handlebars = Handlebars.compile(template);
    htmlContent = handlebars({ days });
  } catch (error) {
    console.log("Failed to compile template:");
    console.log(error);
    return false;
  }

  try {
    await postSingleSend(htmlContent, days[0].formatted);
  } catch (error) {
    console.log("Failed to post single send to SendGrid:");
    console.log(error);
    return false;
  }

  console.log("Done");
  return true;
}
