import * as ftp from "basic-ftp";
import { DOMParser as dom } from "xmldom";
import xpath from "xpath";
import fs from "fs";
import { Settings, DateTime } from "luxon";

import { openHours, sunrises, sunsets } from "./data";

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

function forecastPath(startTime: String) {
  return [
    `//product/forecast/area[@description="Yulara"]/forecast-period[`,
    `@start-time-local="${startTime}"]`,
  ].join("");
}

async function main() {
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

  // const filePath = `/tmp/weather-${Date.now()}.xml`;
  // await getForecast(filePath);
  const filePath = "/tmp/weather-1604356848434.xml";

  const xml = await readFile(filePath);
  const doc = new dom().parseFromString(xml as string);

  days.forEach((day) => {
    ["minimum" as const, "maximum" as const].forEach((tempType) => {
      console.log(
        `${forecastPath(
          day.iso
        )}/element[@type="air_temperature_${tempType}"]/text()`
      );
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

  console.log(days);
}

main();
