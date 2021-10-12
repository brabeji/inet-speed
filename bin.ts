#!/usr/bin/env npx ts-node
import dotenv from 'dotenv';
import { InetSpeed } from './InetSpeed';

dotenv.config();

export const sleep = (duration: number, rejectOnFinish?: boolean) =>
	new Promise((resolve, reject) => setTimeout(rejectOnFinish ? reject : resolve, duration));

(async () => {
	const speed = new InetSpeed();
	while (true) {
		(async () => {
			try {
				await speed.collect();
				console.log('Collected at ', new Date().toISOString());
			} catch (error) {
				console.log(
					'Failed to collected at ',
					new Date().toISOString(),
					error instanceof Error ? error.message : error,
				);
			}
		})();
		await sleep(300 * 1000);
	}
})();
