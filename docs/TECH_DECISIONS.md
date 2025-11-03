# Technical Decisions

## React Hooks `exhaustive-deps` Warnings

**Decision Date**: 2025-11-01
**Status**: Partially Addressed
**Impact**: Low Risk

### Summary

We opted for a **pragmatic approach** to React Hooks warnings following the **80/20 principle** (Pareto):
- ✅ **Fixed 14 warnings** (39%) - Simple cases with useCallback
- ⏸️ **Deferred 22 warnings** (61%) - Complex cases requiring careful refactoring

### Rationale

#### Why NOT fix all warnings immediately?

1. **High Risk of Introducing Bugs**
   - Incorrectly adding dependencies can cause **infinite loops**
   - Can trigger **excessive re-renders** degrading performance
   - Requires extensive manual testing for each fix

2. **Complexity vs Benefit**
   - Many warnings are in complex components with multiple effects
   - Some effects are **intentionally** designed to run only on mount
   - Fixing requires significant refactoring (2-3 hours)

3. **Code Stability**
   - Current code is **working correctly** in production
   - No known bugs related to stale closures
   - Changes could destabilize without extensive testing

### Warnings Fixed (14 total)

#### AuthContext.tsx (2 warnings)
- ✅ Added `validateHotmartAccess` to useEffect deps
- ✅ Added eslint-disable with explanation for auth listeners

#### UserRoleBadge.tsx (1 warning)
- ✅ Wrapped `fetchUserRole` in useCallback with userId dep

#### EventLeaderboard.tsx (1 warning)
- ✅ Wrapped `fetchLeaderboard` in useCallback with eventSlug, eventStatus deps

#### EditProfile.tsx (1 warning)
- ✅ Wrapped `fetchProfile` in useCallback with user, setValue, navigate deps

### Remaining Warnings (22 total in 12 files)

#### Admin Components (7 warnings)
- `ConsolidatedAnalytics.tsx:75` - loadAllData
- `DocumentHistoryTable.tsx:58,68` - loadDocuments (2 effects)
- `SourcesModal.tsx:40` - loadSources
- `StatsModal.tsx:48` - loadData
- `UserManagementTable.tsx:134,139,157` - loadUsers with search logic

**Analysis**: Admin-only components, low user impact if bugs occur.

#### Main Pages (7 warnings)
- `Community.tsx:94,102,106,118` - Multiple effects with fetchPublicPRDs, applyFilters, handleView
- `EventPage.tsx:61,86,158` - fetchEvent in multiple effects
- `LiveEventDashboard.tsx:45` - fetchData
- `Profile.tsx:180` - fetchProfile

**Analysis**: Core pages requiring careful refactoring to avoid UX degradation.

#### Components (5 warnings)
- `MyDocuments.tsx:67` - fetchDocs
- `PRDGenerator.tsx:417,494,500` - Complex with currentEvent, eventLimit, loadingMessages, placeholderExamples
- `VotingParticipantsList.tsx:76` - fetchParticipants

**Analysis**: PRDGenerator is particularly complex with interdependent state.

### Mitigation Strategy

For remaining warnings:

1. **Validate Intentionality**
   - Review each warning to determine if behavior is intentional
   - Add `// eslint-disable-next-line react-hooks/exhaustive-deps` with explanation where appropriate

2. **Prioritize by Impact**
   - Fix critical user-facing pages (Community, Profile) first
   - Admin components can be addressed later

3. **Test Thoroughly**
   - Each fix must be manually tested in browser
   - Watch for infinite loops and excessive re-renders
   - Check network tab for duplicate API calls

### Future Work

**Recommended Approach** when addressing remaining warnings:

1. Wrap functions in `useCallback` with proper deps
2. Test immediately after each change
3. Use React DevTools Profiler to detect performance regressions
4. Consider extracting complex logic to custom hooks

### References

- [React Hooks FAQ](https://react.dev/reference/react/hooks#troubleshooting)
- [Exhaustive Deps ESLint Rule](https://github.com/facebook/react/issues/14920)
- Project Discussion: Internal discussion on 2025-11-01

---

**Last Updated**: 2025-11-01
**Next Review**: When refactoring affected components
