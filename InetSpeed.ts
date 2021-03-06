import speedTest from 'speedtest-net';
import { Client as ElasticClient } from '@elastic/elasticsearch';
// @ts-expect-error
import wifi from 'node-wifi';
import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

wifi.init({ iface: null });

type WifiDescription = {
	ssid: string;
	iface: string;
	bssid: string;
	mac: string; // equals to bssid (for retrocompatibility)
	channel: number;
	frequency: number; // in MHz
	signal_level: number; // in dB
	quality: number; // same as signal level but in %
	security: string; //
	security_flags: string; // encryption protocols (format currently depending of the OS)
	mode: string; // network mode like Infra (format currently depending of the OS)
};

const getWifiDescription = async () => {
	return new Promise<WifiDescription | undefined>((resolve) => {
		wifi.getCurrentConnections((error: any, currentConnections: any[]) => {
			if (error) {
				resolve(undefined);
			} else {
				if (!currentConnections.length) {
					resolve(undefined);
				}
				resolve(currentConnections[0]);
				/*
			  // you may have several connections
			  [
				  {
					  iface: '...', // network interface used for the connection, not available on macOS
					  ssid: '...',
					  bssid: '...',
					  mac: '...', // equals to bssid (for retrocompatibility)
					  channel: <number>,
					  frequency: <number>, // in MHz
					  signal_level: <number>, // in dB
					  quality: <number>, // same as signal level but in %
					  security: '...' //
					  security_flags: '...' // encryption protocols (format currently depending of the OS)
					  mode: '...' // network mode like Infra (format currently depending of the OS)
				  }
			  ]
			  */
			}
		});
	});
};

export class InetSpeed {
	client = new ElasticClient({
		node: process.env['ELASTIC_URL'],
		auth: { apiKey: process.env['ELASTIC_API_KEY'] ?? '' },
	});
	async collect(fullMeasurement: boolean) {
		const timestamp = new Date().toISOString();
		const [wifi, latency, speed, weather] = await Promise.allSettled([
			getWifiDescription().catch(() => {
				return undefined;
			}),
			this.measureLatency().catch(() => {
				return undefined;
			}),
			fullMeasurement
				? speedTest({ acceptGdpr: true, acceptLicense: true }).catch(() => {
						return undefined;
				  })
				: Promise.resolve(null),
			fullMeasurement
				? (
						await fetch(
							`https://api.openweathermap.org/data/2.5/weather?lat=48.84577898333347&lon=14.754778197657101&appid=${process.env['OPEN_WEATHER_API_KEY']}`,
						)
				  )
						.json()
						.catch(() => {
							return undefined;
						})
				: Promise.resolve(null),
		]);

		await this.client.index({
			index: 'inet-speed',
			body: {
				'@timestamp': timestamp,
				wifi: wifi.status === 'fulfilled' ? wifi.value : undefined,
				latency: latency.status === 'fulfilled' ? latency.value : undefined,
				speed: speed.status === 'fulfilled' ? speed.value : undefined,
				weather: weather.status === 'fulfilled' ? weather.value : undefined,
			},
		});
	}

	async measureLatency() {
		const start = performance.now();
		await fetch(`https://status.cloud.google.com/en/feed.atom`);
		const end = performance.now();
		return end - start;
	}
}
