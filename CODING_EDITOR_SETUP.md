# Monaco Code Editor - Coding Round Implementation

## Overview
The AI Interview platform now includes a **Monaco Editor** (VS Code's editor) for the coding round, allowing candidates to write, run, and submit code solutions.

## 📋 Features Implemented

### Frontend Features
✅ **Monaco Editor Integration**
- Syntax highlighting for Python, Java, C++, and JavaScript
- Auto-indentation and code formatting
- Dark theme matching the UI
- Line numbers and minimap disabled for cleaner look
- Real-time code editing with 400px height

✅ **Language Selection**
- Dropdown to switch between Python, Java, C++, JavaScript
- Code templates for each language
- Language preference persisted during question

✅ **Code Execution**
- "Run Code" button to execute code
- Execution output panel with success/error displays
- Color-coded output (green for success, red for errors)
- Placeholder implementation ready for backend integration

✅ **Solution Submission**
- "Submit Solution" button (replaces "Next" for coding rounds)
- Code saved per question
- Automatic progression to next question or round completion

## 🛠️ Technical Implementation

### Dependencies Added
```json
{
  "monaco-editor": "^0.44.0",
  "ngx-monaco-editor-v2": "^17.0.0"
}
```

### Files Modified

#### 1. **call.component.ts**
- Added `MonacoEditorModule` import
- Code editor state management:
  - `editorOptions`: Monaco configuration
  - `codeLanguage`: Current selected language
  - `codeTemplates`: Template code for each language
  - `executionOutput/executionError`: Output display
  - `isRunning`: Execution state

- New Methods:
  - `changeLanguage()`: Switch between programming languages
  - `runCode()`: Execute code (placeholder for backend call)
  - `submitCode()`: Submit solution and move to next question

#### 2. **call.component.html**
- Added Monaco Editor component with `ngx-monaco-editor` directive
- Language selector dropdown
- Run Code button with loading state
- Execution output panel
- Modified question-actions for "Submit Solution" button in coding round

#### 3. **call.component.css**
- `.code-editor-wrapper`: Container for editor and controls
- `.editor-header`: Language selector and action buttons
- `.language-select`: Styled dropdown
- `.monaco-editor`: Editor styling (400px height, dark theme)
- `.execution-panel`: Output display with scrolling
- `.output-success/output-error`: Color-coded output

## 🚀 Backend Integration (Next Steps)

### Required Backend API Endpoint

**Endpoint:** `POST /api/code/execute`

**Request Body:**
```json
{
  "code": "print('Hello, World!')",
  "language": "python",
  "input": "",
  "timeLimit": 5
}
```

**Response:**
```json
{
  "success": true,
  "output": "Hello, World!",
  "error": null,
  "executionTime": 0.234,
  "memoryUsed": 12.5
}
```

### Recommended Backend Stack

#### Option 1: FastAPI + Docker (Recommended)
```python
# Python FastAPI Backend
from fastapi import FastAPI
import docker
import subprocess

@app.post("/api/code/execute")
async def execute_code(request: CodeExecutionRequest):
    # Create isolated container
    # Run code with timeout
    # Return output/error
    pass
```

#### Option 2: Node.js + Sandbox
- Use `vm2` or `isolated-vm` for safe code execution
- Timeout protection for infinite loops
- Memory limits for security

#### Option 3: AWS Lambda or Cloud Run
- Serverless code execution
- Built-in isolation and timeout handling
- Scalable for many concurrent executions

### Update runCode() Method

Replace the placeholder implementation in `call.component.ts`:

```typescript
runCode(): void {
  if (!this.currentAnswer.trim()) {
    this.executionError = 'Please write some code before running.';
    return;
  }
  
  this.isRunning = true;
  this.executionOutput = '';
  this.executionError = '';

  // Call backend API
  this.http.post('/api/code/execute', {
    code: this.currentAnswer,
    language: this.codeLanguage,
    timeLimit: 5
  }).subscribe({
    next: (response: any) => {
      if (response.success) {
        this.executionOutput = response.output;
      } else {
        this.executionError = response.error;
      }
      this.isRunning = false;
    },
    error: (err) => {
      this.executionError = 'Failed to execute code. Try again.';
      this.isRunning = false;
    }
  });
}
```

## 📱 UI Layout

```
┌─────────────────────────────────────┐
│ Assessment in Progress              │
│ R2 – Coding · 1 Question · 30:45    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Problem Statement                   │
│                                     │
│ Write a function to solve X...      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Language: [Python ▼] [▶ Run Code]   │
├─────────────────────────────────────┤
│                                     │
│  1 │ def solve():                   │
│  2 │     # Your solution            │
│  3 │     pass                       │
│                                     │
│  [Monaco Editor Area - 400px]       │
│                                     │
├─────────────────────────────────────┤
│ Execution Output                    │
│ Program executed successfully!      │
│ Output: Result here...              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ [Previous] [Submit Solution] [End]  │
└─────────────────────────────────────┘
```

## 🔒 Security Considerations

1. **Code Sandbox**: Always execute user code in isolated containers
2. **Timeout Protection**: Set max execution time (e.g., 5 seconds)
3. **Memory Limits**: Cap memory usage to prevent DoS
4. **Input Validation**: Validate code length and structure
5. **Logging**: Log all code submissions for monitoring
6. **Rate Limiting**: Limit execution requests per candidate

## 📊 Code Submission Storage

Store candidate submissions with:
```json
{
  "interview_id": "abc123",
  "question_id": "q1",
  "language": "python",
  "code": "def solve():\n  pass",
  "submitted_at": "2026-06-16T10:30:00Z",
  "execution_result": {
    "output": "Result...",
    "error": null,
    "runtime": 0.234
  }
}
```

## 🧪 Testing

### Manual Testing
1. Navigate to coding round
2. Verify Monaco editor loads
3. Test language switching
4. Try Run Code button (currently shows placeholder)
5. Submit solution and verify progression

### Backend Testing
```bash
# Test API endpoint
curl -X POST http://localhost:8000/api/code/execute \
  -H "Content-Type: application/json" \
  -d '{"code":"print(\"hello\")","language":"python"}'
```

## 📝 Code Template Examples

### Python
```python
# Write your Python code here

def solve():
    # Your solution
    pass

if __name__ == "__main__":
    solve()
```

### Java
```java
public class Solution {
    public static void main(String[] args) {
        // Your solution
    }
}
```

### C++
```cpp
#include <iostream>
using namespace std;

int main() {
    // Your solution
    return 0;
}
```

### JavaScript
```javascript
// Write your JavaScript code here

function solve() {
    // Your solution
}

solve();
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Editor not showing | Ensure MonacoEditorModule is imported in component |
| Build errors | Run `npm install` to install dependencies |
| Language not switching | Check that `changeLanguage()` updates editorOptions |
| Output not displaying | Verify backend API endpoint is accessible |

## 📚 Resources

- [Monaco Editor Docs](https://microsoft.github.io/monaco-editor/)
- [ngx-monaco-editor-v2](https://github.com/vincentjr/ngx-monaco-editor-v2)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Docker for Code Sandbox](https://www.docker.com/)

## ✅ Next Steps

1. **Implement Backend API** for code execution
2. **Add test case validation** - show if tests pass/fail
3. **Store execution history** - track all submissions
4. **Performance monitoring** - measure execution time
5. **Advanced features**:
   - Code plagiarism detection
   - AI-powered code suggestions
   - Real-time collaboration (if needed)

---

**Status**: ✅ Frontend Complete | ⏳ Backend Integration Pending
