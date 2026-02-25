# Changelog

## [1.0.1] - 2024-02-25

### Fixed
- **Removed all auto-scroll code** from LiveInsights component
  - Removed `useEffect` hooks for auto-scroll behavior (lines 91-119)
  - Removed `handleScroll` function
  - Fixed eslint errors: 'autoScroll', 'eventsEndRef', 'eventsContainerRef', 'userScrolledRef' not defined

### Removed
- **Auto-scroll functionality** from SimulationTimeline component
  - Removed `autoScroll` prop and related state management
  - Removed `useRef` hooks for timeline scrolling (`timelineEndRef`, `timelineRef`)
  - Removed scroll detection logic
  - Simplified component to display events without automatic scrolling

### Reason
- Auto-scroll behavior was buggy and could interfere with user interaction
- Users can manually scroll through the timeline as needed
- Improves stability and user control

### Files Modified
- `frontend/src/components/insights/SimulationTimeline.js`
- `frontend/src/components/LiveInsights.js`

### Verification
✅ All eslint errors resolved
✅ No diagnostics found in modified files
✅ Application ready for demo

---

## [1.0.0] - 2024-02-25

### Added
- **Enhanced Dashboard** with welcome screen and flow diagram
- **Guided Stepper** for simulation setup (6-step workflow)
- **SimulationTimeline** component for human-readable event display
- **AIAssistantPanel** component for real-time AI insights
- **Demo polish** with animations, transitions, and visual enhancements
- Comprehensive documentation (UPGRADE_SUMMARY.md, DEMO_GUIDE.md)

### Changed
- Simplified navigation from 5 tabs to 4 tabs
- Renamed "Simulation Console" to "Run Simulation"
- Renamed "Scenario Testing" to "Scenarios"
- Updated LiveInsights layout with new timeline and AI assistant
- Enhanced MetricsPanel with subtitles and animations
- Improved color scheme and visual hierarchy

### Removed
- Settings page (unused functionality)
- Raw log display in favor of formatted timeline
- Technical jargon from event messages

### Technical Details
- All changes are frontend-only
- No backend modifications
- No changes to simulation orchestration
- No changes to Docker AI merchant spawning
- No changes to event pipelines

---

## Version History

- **1.0.1**: Removed buggy auto-scroll
- **1.0.0**: Initial demo-ready transformation
