#!/usr/bin/env npx ts-node
import dotenv from 'dotenv';
import { InetSpeed } from './InetSpeed';

dotenv.config();

export const sleep = (duration: number, rejectOnFinish?: boolean) =>
	new Promise((resolve, reject) => setTimeout(rejectOnFinish ? reject : resolve, duration));

const measurementPeriod = 5 * 1000;
const fullMeasurementPeriod = 5 * 1000 * 60;
(async () => {
	let collectedCount = 0;

	const speed = new InetSpeed();
	while (true) {
		(async () => {
			try {
				// const fullMeasurement = !((collectedCount * measurementPeriod) % fullMeasurementPeriod);
				const fullMeasurement = false;
				collectedCount++;
				await speed.collect(fullMeasurement);
				console.log(`Collected at${fullMeasurement ? ` [FULL]` : ''}`, new Date().toISOString());
			} catch (error) {
				console.log(
					'Failed to collect at ',
					new Date().toISOString(),
					error instanceof Error ? error.message : error,
				);
			}
		})();
		await sleep(measurementPeriod);
	}
})();
