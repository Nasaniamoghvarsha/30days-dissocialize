# Contributing to 30 Days Discipline

Thank you for your interest in contributing! This guide will help you get started.

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **Android Studio** with Android SDK 33+
- **Git**
- A physical Android device (accessibility services don't work reliably on emulators)

### Setup

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/30-days-discipline.git
cd 30-days-discipline

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Android

```bash
# Build web assets
npm run build

# Copy to Android project
npx cap copy android

# Open in Android Studio
npx cap open android
```

## 📁 Project Structure

- `src/components/` — React UI screens
- `src/context/` — Global state management (DisciplineContext)
- `src/utils/` — Native bridge and utilities
- `android/app/src/main/java/com/thirtydays/discipline/` — Kotlin native code

## 🔀 Development Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** — follow the existing code style

3. **Test thoroughly**:
   - Run `npm run build` to check for TypeScript errors
   - Test on a real Android device
   - Verify the Accessibility Service still works after your changes

4. **Submit a Pull Request** with:
   - Clear description of what changed and why
   - Screenshots/recordings for UI changes
   - Testing steps for reviewers

## 📝 Code Style

### React/TypeScript
- Functional components with hooks
- Inline styles for component-specific styling
- `useDiscipline()` hook for accessing global state
- Format time values with the `formatTime()` helper

### Kotlin
- Follow existing naming conventions
- All SharedPreferences keys must match between React and Kotlin (no `_cap_` prefix)
- Log with tag `DisciplineInterceptor` for debugging

### CSS
- Use CSS custom properties from `index.css` (e.g., `var(--gold)`, `var(--gray-800)`)
- Animations use Framer Motion in React
- CSS keyframes only for non-React animations (e.g., `budgetPulse`)

## ⚠️ Important Notes

### SharedPreferences Keys
The React and Kotlin layers communicate through SharedPreferences. If you add a new key:
1. Define it in both `NativeBridge.ts` and the relevant Kotlin file
2. **Do NOT** add a `_cap_` prefix — Capacitor v8 stores keys as-is
3. Document the key in `ARCHITECTURE.md`

### Accessibility Service
- Android force-disables the service on every new build install
- Always toggle OFF → ON in device Settings after installing a new build
- Test with `adb logcat -s DisciplineInterceptor` for debugging

## 🐛 Reporting Bugs

Open an issue with:
- Device model and Android version
- Steps to reproduce
- Expected vs. actual behavior
- Logcat output if applicable (`adb logcat -s DisciplineInterceptor`)

## 💡 Feature Requests

Open an issue with the `enhancement` label. Include:
- Clear description of the feature
- Why it would be useful
- Any mock-ups or examples

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.
