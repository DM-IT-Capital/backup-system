# Discovery behavior fix

The previous UI marked a server as `reachable` immediately after clicking **Discover**. That was only a local UI state change and did not prove that the IP was actually reachable.

This patch changes discovery behavior:

- Clicking **Discover** now changes the server status to `checking`.
- The API queues a `discover_server` command for the customer gateway.
- The UI shows that the gateway discovery command was queued.
- The server is no longer marked `reachable` until a real gateway/agent result updates the backend.

Important: Vercel cannot reliably test private customer LAN IP addresses such as `10.x.x.x`, `172.16.x.x`, or `192.168.x.x` from the cloud. Reachability must be checked by a gateway running inside the customer network, then reported back to the control plane.

Recommended next implementation step:

- Build a gateway polling endpoint for queued commands.
- Build a gateway result endpoint that updates `protected_servers.last_seen_at` only when the gateway confirms the target IP is reachable.
- Keep **Install agent** blocked until the server becomes `reachable`.
