# 🚀 Deployment Checklist & Rollback Plan

## Pre-Deployment

### ✅ Environment Verification
- [ ] PostgreSQL version ≥ 12
- [ ] Node.js version ≥ 16
- [ ] React version ≥ 18
- [ ] All three source tables exist and have data
- [ ] Staging environment available for testing
- [ ] Database backup completed

### ✅ Backup Strategy
```bash
# Full database backup
pg_dump -U your_user -h your_host -d your_database \
  -F c -b -v -f "backup_pre_multidimensional_$(date +%Y%m%d_%H%M%S).dump"

# Verify backup
pg_restore -l backup_pre_multidimensional_*.dump | head -20
```

## Deployment Steps

### Phase 1: Database Migration (5 min)
```bash
# Test in staging first
psql -U staging_user -d staging_db -f database/migrations/add_multidimensional_settings.sql

# Verify columns created
psql -U staging_user -d staging_db -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'receiving_metrics_settings' 
  AND column_name IN ('clearance_min_inventory', 'core_item_min_sales_months');
"
```

### Phase 2: Backend Deployment (10 min)
```bash
# Backup current code
cp server/routes/receiving-metrics.ts server/routes/receiving-metrics.backup.ts

# Deploy new code & restart
npm run server:restart
```

### Phase 3: Frontend Deployment (10 min)
```bash
npm run build
# Deploy to production
```

### Phase 4: Initial Calculation (10 min)
Navigate to `/settings/receiving-metrics` and click "Calculate All Metrics"

## Rollback Plan

### Scenario 1: Migration Failed
```bash
# Restore from backup
pg_restore -U prod_user -d prod_db backup_prod_pre_multidim_*.dump
```

### Scenario 2: Backend Issues
```bash
# Restore backend code
cp server/routes/receiving-metrics.backup.ts server/routes/receiving-metrics.ts
pm2 restart all
```

## Success Checklist

- [ ] All backups completed
- [ ] Migration successful
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] Calculation completed
- [ ] Validation passing
- [ ] Excel export working

**Deployment Date:** __________  
**Deployed By:** __________  
**Success:** [ ]
