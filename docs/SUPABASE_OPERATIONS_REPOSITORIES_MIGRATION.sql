alter type managed_user_account_type add value if not exists 'platform_admin';
alter type managed_user_account_type add value if not exists 'customer_user';

alter table managed_users
add column if not exists account_type managed_user_account_type not null default 'customer_user';

alter table managed_users
alter column customer_id drop not null;

-- Repository capacity, usage, immutability, and health are stored in repositories.config:
-- {
--   "location": "\\\\backup-nas\\repo-a",
--   "capacityGb": 4096,
--   "usedGb": 1430,
--   "immutable": true,
--   "status": "success"
-- }

-- Operation runtime details are stored in protection_jobs.policy:
-- {
--   "target": "vSphere cluster",
--   "rpo": "4h",
--   "repositoryId": "repo-id",
--   "status": "running",
--   "progressPercent": 62,
--   "throughputMbps": 412,
--   "processedGb": 1280,
--   "duration": "22 min",
--   "bottleneck": "Network"
-- }
