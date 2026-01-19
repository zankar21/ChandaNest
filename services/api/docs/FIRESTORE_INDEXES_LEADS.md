# Leads Firestore Indexes

Required composite indexes for leads queries:

Collection group: `leads`
- `updatedAt` desc, `__name__` desc
- `stage` asc, `updatedAt` desc, `__name__` desc
- `assignee.uid` asc, `updatedAt` desc, `__name__` desc

Notes:
- The list endpoint orders by `updatedAt` desc and `__name__` desc.
- Filters on `stage` and `assignee.uid` require composite indexes.
- Date range filters on `updatedAt` with additional fields may require extra composite indexes.
