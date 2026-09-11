/* ─────────────────────────────────────────────────────────────────
   STRIVER A2Z DSA SHEET — Complete Roadmap Data
   Follow the exact order from takeuforward.org
   ───────────────────────────────────────────────────────────────── */

export const DSA_STORAGE_KEY = 'dp_dsa_progress_v1'
export const DSA_SOLUTIONS_KEY = 'dp_dsa_solutions_v1'
export const DSA_DAILY_KEY = 'dp_dsa_daily_v1'

/* ── In-memory cache (synced from DB) ── */
let _progressCache = null
let _dailyCache = null
let _solutionsCache = null
let _notesCache = null
let _dbSynced = false

/* ── Sync from DB on first load ── */
export async function syncFromDB() {
  if (_dbSynced) return

  // Read localStorage FIRST before anything overwrites it
  const localProgress = _safeLoadJSON(DSA_STORAGE_KEY)
  const localDaily = _safeLoadJSON(DSA_DAILY_KEY)
  const localSolutions = _safeLoadJSON(DSA_SOLUTIONS_KEY)
  const localNotes = _safeLoadJSON('dp_dsa_notes_v1')

  try {
    const [progRes, dailyRes, solRes, notesRes] = await Promise.all([
      fetch('/api/dsa/progress').then(r => r.json()),
      fetch('/api/dsa/daily').then(r => r.json()),
      fetch('/api/dsa/solutions').then(r => r.json()),
      fetch('/api/dsa/notes').then(r => r.json()),
    ])

    // Migration: if DB is empty but localStorage has data, push to DB
    if (Object.keys(progRes).length === 0 && Object.keys(localProgress).length > 0) {
      await fetch('/api/dsa/progress/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: localProgress, daily: localDaily }),
      })
      _progressCache = localProgress
      _dailyCache = localDaily

      for (const [pid, code] of Object.entries(localSolutions)) {
        fetch('/api/dsa/solutions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ problem_id: pid, code }),
        })
      }
      _solutionsCache = localSolutions

      for (const [pid, content] of Object.entries(localNotes)) {
        fetch('/api/dsa/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ problem_id: pid, content }),
        })
      }
      _notesCache = localNotes
    } else {
      // DB has data — merge: DB wins, but keep any localStorage-only entries
      _progressCache = { ...localProgress, ...progRes }
      _dailyCache = { ...localDaily, ...dailyRes }
      _solutionsCache = { ...localSolutions, ...solRes }
      _notesCache = { ...localNotes, ...notesRes }
    }

    // Update localStorage cache from merged data
    localStorage.setItem(DSA_STORAGE_KEY, JSON.stringify(_progressCache))
    localStorage.setItem(DSA_DAILY_KEY, JSON.stringify(_dailyCache))
    localStorage.setItem(DSA_SOLUTIONS_KEY, JSON.stringify(_solutionsCache))
    localStorage.setItem('dp_dsa_notes_v1', JSON.stringify(_notesCache))

    _dbSynced = true
  } catch {
    // DB unavailable — fall back to localStorage
    _progressCache = localProgress
    _dailyCache = localDaily
    _solutionsCache = localSolutions
    _notesCache = localNotes
  }
}

function _safeLoadJSON(key) {
  try { return JSON.parse(localStorage.getItem(key)) || {} }
  catch { return {} }
}

function localDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ── Progress ── */
export function loadProgress() {
  if (_progressCache) return _progressCache
  return _safeLoadJSON(DSA_STORAGE_KEY)
}

export function saveProgress(p, changedProbId, newStatus) {
  _progressCache = p
  localStorage.setItem(DSA_STORAGE_KEY, JSON.stringify(p))

  // Save to DB with topic name for study_log auto-logging
  if (changedProbId !== undefined) {
    // Resolve problem title from ID (e.g. s2_t1_p1 → "Sort an Array of 0s 1s and 2s")
    let topicLabel = changedProbId
    const m = changedProbId.match(/^s(\d+)_t(\d+)_p(\d+)$/)
    if (m) {
      const [, si, ti, pi] = m.map(Number)
      const prob = STEPS[si]?.topics[ti]?.problems[pi]
      if (prob) topicLabel = prob.title
    }

    fetch('/api/dsa/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problem_id: changedProbId, status: newStatus, topic: topicLabel }),
    }).catch(() => {})
  }

  // Track daily history when solved
  if (changedProbId && newStatus === 2) {
    const today = localDateStr()
    const daily = loadDailyHistory()
    if (!daily[today]) daily[today] = []
    if (!daily[today].includes(changedProbId)) {
      daily[today].push(changedProbId)
    }
    _dailyCache = daily
    localStorage.setItem(DSA_DAILY_KEY, JSON.stringify(daily))
  }
}

/* ── Daily History ── */
export function loadDailyHistory() {
  if (_dailyCache) return _dailyCache
  return _safeLoadJSON(DSA_DAILY_KEY)
}

export function getDailyStats(date) {
  const daily = loadDailyHistory()
  const solved = daily[date] || []
  const titles = solved.map(pid => {
    const m = pid.match(/^s(\d+)_t(\d+)_p(\d+)$/)
    if (!m) return pid
    const [, si, ti, pi] = m.map(Number)
    const prob = STEPS[si]?.topics[ti]?.problems[pi]
    return prob ? prob.title : pid
  })
  return { count: solved.length, problems: titles, ids: solved }
}

/* ── Solutions ── */
export function loadSolutions() {
  if (_solutionsCache) return _solutionsCache
  return _safeLoadJSON(DSA_SOLUTIONS_KEY)
}

export function saveSolution(pid, code) {
  if (!_solutionsCache) _solutionsCache = _safeLoadJSON(DSA_SOLUTIONS_KEY)
  _solutionsCache[pid] = code
  localStorage.setItem(DSA_SOLUTIONS_KEY, JSON.stringify(_solutionsCache))

  // Save to DB
  fetch('/api/dsa/solutions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problem_id: pid, code }),
  }).catch(() => {})
}

/* ── Notes ── */
export function loadNotes() {
  if (_notesCache) return _notesCache
  return _safeLoadJSON('dp_dsa_notes_v1')
}

export function saveNote(pid, content) {
  if (!_notesCache) _notesCache = _safeLoadJSON('dp_dsa_notes_v1')
  _notesCache[pid] = content
  localStorage.setItem('dp_dsa_notes_v1', JSON.stringify(_notesCache))

  // Save to DB
  fetch('/api/dsa/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problem_id: pid, content }),
  }).catch(() => {})
}

export function problemId(stepIdx, topicIdx, probIdx) {
  return `s${stepIdx}_t${topicIdx}_p${probIdx}`
}

// Status: 0 = not started, 1 = attempted, 2 = solved
export function cycleStatus(current) {
  return ((Number(current) || 0) + 1) % 3
}

export const STATUS_META = {
  0: { label: '○', color: '#94a3b8', tip: 'Not started' },
  1: { label: '~', color: '#f59e0b', tip: 'Attempted' },
  2: { label: '✓', color: '#22c55e', tip: 'Solved' },
}

export const DIFFICULTY_COLORS = {
  Easy: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
  Medium: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  Hard: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
}

/*
  Each problem: { title, difficulty, description?, starterCode?, testCases? }
  description/starterCode/testCases will be filled in 10/day.
  For now, title + difficulty is enough for the roadmap UI.
*/

export const STEPS = [
  // ═══════════════════ STEP 1 ═══════════════════
  {
    id: 'step1',
    step: 1,
    title: 'Learn the Basics',
    icon: '📘',
    color: '#3b82f6',
    topics: [
      {
        label: 'Things to Know in C++/Java/Python',
        problems: [
          {
            title: 'User Input / Output',
            difficulty: 'Easy',
            description: `<h3>Problem</h3><p>Write a function that reads a line of raw input and formats it back as output. Given a string <code>line</code> containing space-separated tokens, parse it and return a formatted summary string.</p><p>Rules, applied in order:</p><ul><li>Split <code>line</code> on whitespace into tokens (any run of spaces/tabs is one separator; leading and trailing whitespace is ignored).</li><li>If there are <b>no</b> tokens, return the exact string <code>"No input"</code>.</li><li>A token is an <b>integer token</b> if it matches an optional leading <code>+</code> or <code>-</code> followed by one or more digits (e.g. <code>42</code>, <code>-7</code>, <code>+0</code>). Everything else is a <b>word token</b>.</li><li>Return <code>"Count: c | Sum: s | Words: w"</code> where <code>c</code> is the total number of tokens, <code>s</code> is the sum of all integer tokens (<code>0</code> if none), and <code>w</code> is the word tokens joined by a single space (or the empty string if none).</li></ul><p>Note that <code>line</code> may be <code>None</code>, which is treated the same as an empty line.</p><h3>Examples</h3><pre>Input:  line = "10 20 hello 30"
Output: "Count: 4 | Sum: 60 | Words: hello"
Explanation: 4 tokens. Integers 10 + 20 + 30 = 60. Only word token is "hello".</pre><pre>Input:  line = "  a   b  "
Output: "Count: 2 | Sum: 0 | Words: a b"
Explanation: Extra whitespace collapses. No integer tokens, so sum is 0.</pre><pre>Input:  line = ""
Output: "No input"
Explanation: Empty line has no tokens.</pre><pre>Input:  line = "-5 +5 3.14"
Output: "Count: 3 | Sum: 0 | Words: 3.14"
Explanation: -5 and +5 are integers summing to 0. "3.14" contains a dot, so it is a word token.</pre><h3>Constraints</h3><ul><li><code>line</code> is a string or <code>None</code></li><li><code>0 &lt;= len(line) &lt;= 10^5</code></li><li>Each token has length at most <code>20</code></li><li>Integer tokens fit in the range <code>-10^18</code> to <code>10^18</code></li><li>Tokens contain only printable ASCII characters</li></ul>`,
            starterCode: `def format_input(line):
    """
    Parse a raw input line and return a formatted summary.

    Splits \`line\` on whitespace into tokens. Returns "No input" when there are
    no tokens (including when \`line\` is None or all whitespace). Otherwise
    returns "Count: c | Sum: s | Words: w" where c is the token count, s is the
    sum of integer tokens (optional +/- sign followed by digits, 0 if none),
    and w is the remaining word tokens joined by a single space.

    Args:
        line (str | None): The raw input line.

    Returns:
        str: The formatted summary string.
    """
    pass


# --- Test cases (do not modify) ---
print(format_input("10 20 hello 30"))
print(format_input("  a   b  "))
print(format_input(""))

print("\\u2550\\u2550\\u2550TEST_RESULTS\\u2550\\u2550\\u2550")

tests = [
    ("10 20 hello 30", "Count: 4 | Sum: 60 | Words: hello"),
    ("", "No input"),
    (None, "No input"),
    ("     ", "No input"),
    ("\\t\\n  \\t", "No input"),
    ("42", "Count: 1 | Sum: 42 | Words: "),
    ("hi", "Count: 1 | Sum: 0 | Words: hi"),
    ("1 2", "Count: 2 | Sum: 3 | Words: "),
    ("  a   b  ", "Count: 2 | Sum: 0 | Words: a b"),
    ("-5 +5 3.14", "Count: 3 | Sum: 0 | Words: 3.14"),
    ("7 7 7 7", "Count: 4 | Sum: 28 | Words: "),
    ("x x x", "Count: 3 | Sum: 0 | Words: x x x"),
    ("0 -0 +0", "Count: 3 | Sum: 0 | Words: "),
    ("-1 -2 -3", "Count: 3 | Sum: -6 | Words: "),
    ("1000000000000000000 -1000000000000000000", "Count: 2 | Sum: 0 | Words: "),
    ("1000000000000000000", "Count: 1 | Sum: 1000000000000000000 | Words: "),
    ("1 a 2 b 3 c", "Count: 6 | Sum: 6 | Words: a b c"),
    ("- + ++ --", "Count: 4 | Sum: 0 | Words: - + ++ --"),
    ("12a a12 1_2", "Count: 3 | Sum: 0 | Words: 12a a12 1_2"),
    ("5\\t\\t-5\\n10", "Count: 3 | Sum: 10 | Words: "),
    (" ".join(["1"] * 1000), "Count: 1000 | Sum: 1000 | Words: "),
]

all_pass = True
for i, (arg, expected) in enumerate(tests, 1):
    try:
        got = format_input(arg)
    except Exception as e:
        got = "EXCEPTION: %r" % (e,)
    if got == expected:
        print("Test %d: PASSED \\u2705" % i)
    else:
        all_pass = False
        shown = arg if arg is None or len(arg) <= 40 else arg[:37] + "..."
        print("Test %d: FAILED \\u274c | input=%r | expected=%r | got=%r" % (i, shown, expected, got))

if all_pass:
    print("\\n\\U0001F389 All tests passed!")
`,
          },
          { title: 'Data Types', difficulty: 'Easy' },
          { title: 'If Else Statements', difficulty: 'Easy' },
          { title: 'Switch Statement', difficulty: 'Easy' },
          { title: 'What are Arrays & Strings', difficulty: 'Easy' },
          { title: 'For Loops', difficulty: 'Easy' },
          { title: 'While Loops', difficulty: 'Easy' },
          { title: 'Functions (Pass by Reference and Value)', difficulty: 'Easy' },
        ],
      },
      {
        label: 'Build-up Logical Thinking (Patterns)',
        problems: [
          { title: 'Pattern 1 — Rectangular Star', difficulty: 'Easy' },
          { title: 'Pattern 2 — Right-Angled Triangle', difficulty: 'Easy' },
          { title: 'Pattern 3 — Right-Angled Number Triangle', difficulty: 'Easy' },
          { title: 'Pattern 4 — Right-Angled Number Triangle II', difficulty: 'Easy' },
          { title: 'Pattern 5 — Inverted Right Triangle', difficulty: 'Easy' },
          { title: 'Pattern 6 — Inverted Number Triangle', difficulty: 'Easy' },
          { title: 'Pattern 7 — Star Pyramid', difficulty: 'Easy' },
          { title: 'Pattern 8 — Inverted Pyramid', difficulty: 'Easy' },
          { title: 'Pattern 9 — Diamond Star', difficulty: 'Easy' },
          { title: 'Pattern 10 — Half Diamond Star', difficulty: 'Easy' },
          { title: 'Pattern 11 — Binary Number Triangle', difficulty: 'Easy' },
          { title: 'Pattern 12 — Number Crown', difficulty: 'Easy' },
          { title: 'Pattern 13 — Increasing Number Triangle', difficulty: 'Easy' },
          { title: 'Pattern 14 — Increasing Letter Triangle', difficulty: 'Easy' },
          { title: 'Pattern 15 — Reverse Letter Triangle', difficulty: 'Easy' },
          { title: 'Pattern 16 — Alpha-Ramp', difficulty: 'Easy' },
          { title: 'Pattern 17 — Alpha-Hill', difficulty: 'Medium' },
          { title: 'Pattern 18 — Alpha-Triangle', difficulty: 'Medium' },
          { title: 'Pattern 19 — Symmetric-Void', difficulty: 'Medium' },
          { title: 'Pattern 20 — Symmetric-Butterfly', difficulty: 'Medium' },
          { title: 'Pattern 21 — Hollow Rectangle', difficulty: 'Medium' },
          { title: 'Pattern 22 — The Number Pattern', difficulty: 'Medium' },
        ],
      },
      {
        label: 'Learn STL / Java Collections / Python Builtins',
        problems: [
          { title: 'C++ STL / Java Collections / Python Libraries', difficulty: 'Easy' },
        ],
      },
      {
        label: 'Know Basic Maths',
        problems: [
          { title: 'Count Digits', difficulty: 'Easy' },
          { title: 'Reverse a Number', difficulty: 'Easy' },
          { title: 'Check Palindrome', difficulty: 'Easy' },
          { title: 'GCD or HCF', difficulty: 'Easy' },
          { title: 'Armstrong Numbers', difficulty: 'Easy' },
          { title: 'Print all Divisors', difficulty: 'Easy' },
          { title: 'Check for Prime', difficulty: 'Easy' },
        ],
      },
      {
        label: 'Learn Basic Recursion',
        problems: [
          {
            title: 'Print something N times',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given a number <code>N</code>, print the string <code>"Hello"</code> exactly <b>N</b> times using <b>recursion</b>. You must NOT use any loop (for, while).</p>

<h3>Examples</h3>
<pre>Input: N = 3
Output:
Hello
Hello
Hello</pre>
<pre>Input: N = 1
Output:
Hello</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 100</li>
<li>Must use recursion, no loops allowed</li>
</ul>`,
            starterCode: `def print_n_times(n):
    """Print "Hello" exactly n times using recursion."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    import io, sys
    tests = [1, 3, 5]
    expected = [
        "Hello",
        "Hello\\nHello\\nHello",
        "Hello\\nHello\\nHello\\nHello\\nHello",
    ]
    results = []
    for i, n in enumerate(tests):
        buf = io.StringIO()
        old = sys.stdout
        sys.stdout = buf
        try:
            print_n_times(n)
        except Exception as e:
            sys.stdout = old
            results.append((n, f"ERROR: {e}", expected[i]))
            continue
        sys.stdout = old
        got = buf.getvalue().rstrip()
        results.append((n, got, expected[i]))
    print(f"print_n_times({results[-1][0]}):")
    print(results[-1][1] if results[-1][1] else "(no output)")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (n, got, exp) in enumerate(results):
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  n={n}")
        else:
            all_pass = False
            print(f"Test {i+1}: FAILED ❌  n={n}")
            print(f"  Expected:")
            for line in exp.split("\\n"):
                print(f"    {line}")
            print(f"  Got:")
            for line in (got or "(no output)").split("\\n"):
                print(f"    {line}")
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Print 1 to N using Recursion',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given a number <code>N</code>, print all numbers from <b>1 to N</b> (each on a new line) using <b>recursion</b>. No loops allowed.</p>

<h3>Examples</h3>
<pre>Input: N = 5
Output:
1
2
3
4
5</pre>
<pre>Input: N = 1
Output:
1</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 1000</li>
<li>Must use recursion, no loops</li>
</ul>`,
            starterCode: `def print_1_to_n(n):
    """Print numbers from 1 to n using recursion."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    import io, sys
    tests = [1, 5, 10]
    expected = [
        "1",
        "1\\n2\\n3\\n4\\n5",
        "\\n".join(str(i) for i in range(1, 11)),
    ]
    results = []
    for i, n in enumerate(tests):
        buf = io.StringIO()
        old = sys.stdout
        sys.stdout = buf
        try:
            print_1_to_n(n)
        except Exception as e:
            sys.stdout = old
            results.append((n, f"ERROR: {e}", expected[i]))
            continue
        sys.stdout = old
        got = buf.getvalue().rstrip()
        results.append((n, got, expected[i]))
    print(f"print_1_to_n({results[-1][0]}):")
    print(results[-1][1] if results[-1][1] else "(no output)")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (n, got, exp) in enumerate(results):
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  n={n}")
        else:
            all_pass = False
            print(f"Test {i+1}: FAILED ❌  n={n}")
            print(f"  Expected:")
            for line in exp.split("\\n"):
                print(f"    {line}")
            print(f"  Got:")
            for line in (got or "(no output)").split("\\n"):
                print(f"    {line}")
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Print N to 1 using Recursion',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given a number <code>N</code>, print all numbers from <b>N down to 1</b> (each on a new line) using <b>recursion</b>. No loops allowed.</p>

<h3>Examples</h3>
<pre>Input: N = 5
Output:
5
4
3
2
1</pre>
<pre>Input: N = 3
Output:
3
2
1</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 1000</li>
<li>Must use recursion, no loops</li>
</ul>`,
            starterCode: `def print_n_to_1(n):
    """Print numbers from n down to 1 using recursion."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    import io, sys
    tests = [1, 5, 8]
    expected = [
        "1",
        "5\\n4\\n3\\n2\\n1",
        "\\n".join(str(i) for i in range(8, 0, -1)),
    ]
    results = []
    for i, n in enumerate(tests):
        buf = io.StringIO()
        old = sys.stdout
        sys.stdout = buf
        try:
            print_n_to_1(n)
        except Exception as e:
            sys.stdout = old
            results.append((n, f"ERROR: {e}", expected[i]))
            continue
        sys.stdout = old
        got = buf.getvalue().rstrip()
        results.append((n, got, expected[i]))
    print(f"print_n_to_1({results[-1][0]}):")
    print(results[-1][1] if results[-1][1] else "(no output)")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (n, got, exp) in enumerate(results):
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  n={n}")
        else:
            all_pass = False
            print(f"Test {i+1}: FAILED ❌  n={n}")
            print(f"  Expected:")
            for line in exp.split("\\n"):
                print(f"    {line}")
            print(f"  Got:")
            for line in (got or "(no output)").split("\\n"):
                print(f"    {line}")
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Sum of first N numbers',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given a number <code>N</code>, find the <b>sum of the first N natural numbers</b> (1 + 2 + ... + N) using <b>recursion</b>.</p>

<h3>Examples</h3>
<pre>Input: N = 5
Output: 15
Explanation: 1+2+3+4+5 = 15</pre>
<pre>Input: N = 10
Output: 55</pre>
<pre>Input: N = 1
Output: 1</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10000</li>
<li>Must use recursion</li>
</ul>`,
            starterCode: `def sum_of_n(n):
    """Return the sum of first n natural numbers using recursion."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [(1, 1), (5, 15), (10, 55), (100, 5050), (0, 0)]
    try:
        print(f"sum_of_n(5) = {sum_of_n(5)}")
        print(f"sum_of_n(10) = {sum_of_n(10)}")
        print(f"sum_of_n(100) = {sum_of_n(100)}")
    except Exception as e:
        print(f"ERROR: {e}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (n, exp) in enumerate(tests):
        try:
            got = sum_of_n(n)
        except Exception as e:
            print(f"Test {i+1}: ERROR ❌  sum_of_n({n}) → {e}")
            all_pass = False
            continue
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  sum_of_n({n}) = {got}")
        else:
            print(f"Test {i+1}: FAILED ❌  sum_of_n({n})")
            print(f"  Expected: {exp}")
            print(f"  Got:      {got}")
            all_pass = False
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Factorial of N numbers',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given a number <code>N</code>, find <b>N!</b> (N factorial) using <b>recursion</b>.</p>
<p><code>N! = N × (N-1) × (N-2) × ... × 1</code></p>
<p>Special case: <code>0! = 1</code></p>

<h3>Examples</h3>
<pre>Input: N = 5
Output: 120
Explanation: 5! = 5×4×3×2×1 = 120</pre>
<pre>Input: N = 0
Output: 1</pre>
<pre>Input: N = 10
Output: 3628800</pre>

<h3>Constraints</h3>
<ul>
<li>0 ≤ N ≤ 20</li>
<li>Must use recursion</li>
</ul>`,
            starterCode: `def factorial(n):
    """Return n! using recursion."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [(0, 1), (1, 1), (5, 120), (10, 3628800), (7, 5040)]
    try:
        print(f"factorial(5) = {factorial(5)}")
        print(f"factorial(10) = {factorial(10)}")
    except Exception as e:
        print(f"ERROR: {e}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (n, exp) in enumerate(tests):
        try:
            got = factorial(n)
        except Exception as e:
            print(f"Test {i+1}: ERROR ❌  factorial({n}) → {e}")
            all_pass = False
            continue
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  factorial({n}) = {got}")
        else:
            print(f"Test {i+1}: FAILED ❌  factorial({n})")
            print(f"  Expected: {exp}")
            print(f"  Got:      {got}")
            all_pass = False
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Reverse an Array',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given an array <code>arr</code>, reverse it <b>in-place</b> using <b>recursion</b>. Return the reversed array.</p>

<h3>Examples</h3>
<pre>Input: [1, 2, 3, 4, 5]
Output: [5, 4, 3, 2, 1]</pre>
<pre>Input: [1, 2]
Output: [2, 1]</pre>
<pre>Input: [1]
Output: [1]</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ len(arr) ≤ 10000</li>
<li>Must use recursion (hint: swap from both ends)</li>
</ul>`,
            starterCode: `def reverse_array(arr):
    """Reverse the array in-place using recursion and return it."""
    # Your code here
    # Hint: use a helper function with two pointers (left, right)
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]),
        ([1, 2], [2, 1]),
        ([1], [1]),
        ([10, 20, 30, 40], [40, 30, 20, 10]),
        ([], []),
    ]
    try:
        print(f"reverse_array([1,2,3,4,5]) = {reverse_array([1,2,3,4,5])}")
        print(f"reverse_array([10,20,30]) = {reverse_array([10,20,30])}")
    except Exception as e:
        print(f"ERROR: {e}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (inp, exp) in enumerate(tests):
        try:
            arr = inp[:]
            got = reverse_array(arr)
        except Exception as e:
            print(f"Test {i+1}: ERROR ❌  reverse_array({inp}) → {e}")
            all_pass = False
            continue
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  {inp} → {got}")
        else:
            print(f"Test {i+1}: FAILED ❌  Input: {inp}")
            print(f"  Expected: {exp}")
            print(f"  Got:      {got}")
            all_pass = False
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Check if a string is Palindrome',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given a string <code>s</code>, check whether it is a <b>palindrome</b> using <b>recursion</b>. A palindrome reads the same forwards and backwards.</p>
<p>Consider only alphanumeric characters and ignore cases for this problem.</p>

<h3>Examples</h3>
<pre>Input: "madam"
Output: True</pre>
<pre>Input: "hello"
Output: False</pre>
<pre>Input: "racecar"
Output: True</pre>
<pre>Input: "a"
Output: True</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ len(s) ≤ 1000</li>
<li>String contains only lowercase letters</li>
<li>Must use recursion</li>
</ul>`,
            starterCode: `def is_palindrome(s):
    """Check if string s is a palindrome using recursion."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ("madam", True),
        ("hello", False),
        ("racecar", True),
        ("a", True),
        ("ab", False),
        ("abba", True),
        ("abcba", True),
        ("abcda", False),
    ]
    try:
        print(f'is_palindrome("madam") = {is_palindrome("madam")}')
        print(f'is_palindrome("hello") = {is_palindrome("hello")}')
        print(f'is_palindrome("racecar") = {is_palindrome("racecar")}')
    except Exception as e:
        print(f"ERROR: {e}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (s, exp) in enumerate(tests):
        try:
            got = is_palindrome(s)
        except Exception as e:
            print(f"Test {i+1}: ERROR ❌  is_palindrome(\\"{s}\\") → {e}")
            all_pass = False
            continue
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  is_palindrome(\\"{s}\\") = {got}")
        else:
            print(f"Test {i+1}: FAILED ❌  is_palindrome(\\"{s}\\")")
            print(f"  Expected: {exp}")
            print(f"  Got:      {got}")
            all_pass = False
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Fibonacci Number',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given <code>N</code>, find the <b>Nth Fibonacci number</b> using <b>recursion</b>.</p>
<p>The Fibonacci sequence: <code>0, 1, 1, 2, 3, 5, 8, 13, 21, ...</code></p>
<p><code>F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2)</code></p>

<h3>Examples</h3>
<pre>Input: N = 0
Output: 0</pre>
<pre>Input: N = 5
Output: 5
Explanation: F(5) = 0,1,1,2,3,<b>5</b></pre>
<pre>Input: N = 10
Output: 55</pre>

<h3>Constraints</h3>
<ul>
<li>0 ≤ N ≤ 30</li>
<li>Must use recursion</li>
</ul>

<h3>Bonus</h3>
<p>Can you optimize with memoization to handle larger N?</p>`,
            starterCode: `def fibonacci(n):
    """Return the nth Fibonacci number using recursion."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [(0, 0), (1, 1), (2, 1), (5, 5), (10, 55), (15, 610), (20, 6765)]
    try:
        print(f"fibonacci(5) = {fibonacci(5)}")
        print(f"fibonacci(10) = {fibonacci(10)}")
        print(f"fibonacci(20) = {fibonacci(20)}")
    except Exception as e:
        print(f"ERROR: {e}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (n, exp) in enumerate(tests):
        try:
            got = fibonacci(n)
        except Exception as e:
            print(f"Test {i+1}: ERROR ❌  fibonacci({n}) → {e}")
            all_pass = False
            continue
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  fibonacci({n}) = {got}")
        else:
            print(f"Test {i+1}: FAILED ❌  fibonacci({n})")
            print(f"  Expected: {exp}")
            print(f"  Got:      {got}")
            all_pass = False
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
        ],
      },
      {
        label: 'Learn Basic Hashing',
        problems: [
          {
            title: 'Counting Frequencies of Array Elements',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given an array <code>arr</code> of <b>N</b> integers, count the frequency of each element and return a dictionary mapping each element to its count.</p>

<h3>Examples</h3>
<pre>Input: [1, 2, 2, 3, 3, 3]
Output: {1: 1, 2: 2, 3: 3}</pre>
<pre>Input: [10, 10, 10, 5]
Output: {10: 3, 5: 1}</pre>
<pre>Input: [1]
Output: {1: 1}</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10<sup>5</sup></li>
<li>1 ≤ arr[i] ≤ 10<sup>5</sup></li>
</ul>`,
            starterCode: `def count_frequencies(arr):
    """Return a dictionary with frequency of each element."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([1, 2, 2, 3, 3, 3], {1: 1, 2: 2, 3: 3}),
        ([10, 10, 10, 5], {10: 3, 5: 1}),
        ([1], {1: 1}),
        ([5, 5, 5, 5, 5], {5: 5}),
        ([1, 2, 3, 4, 5], {1: 1, 2: 1, 3: 1, 4: 1, 5: 1}),
    ]
    try:
        print(f"count_frequencies([1,2,2,3,3,3]) = {count_frequencies([1,2,2,3,3,3])}")
        print(f"count_frequencies([10,10,10,5]) = {count_frequencies([10,10,10,5])}")
    except Exception as e:
        print(f"ERROR: {e}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (inp, exp) in enumerate(tests):
        try:
            got = count_frequencies(inp[:])
        except Exception as e:
            print(f"Test {i+1}: ERROR ❌  count_frequencies({inp}) → {e}")
            all_pass = False
            continue
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  {inp}")
        else:
            print(f"Test {i+1}: FAILED ❌  Input: {inp}")
            print(f"  Expected: {exp}")
            print(f"  Got:      {got}")
            all_pass = False
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Find Highest / Lowest Frequency Element',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given an array <code>arr</code> of <b>N</b> integers, find the element with the <b>highest frequency</b> and the element with the <b>lowest frequency</b>. Return them as a tuple <code>(highest, lowest)</code>.</p>
<p>If there are ties, return the <b>smallest element</b> among those tied.</p>

<h3>Examples</h3>
<pre>Input: [1, 2, 2, 3, 3, 3]
Output: (3, 1)
Explanation: 3 appears 3 times (most), 1 appears 1 time (least)</pre>
<pre>Input: [10, 10, 5, 5]
Output: (5, 5)
Explanation: Both appear 2 times (tie), return smallest for both</pre>
<pre>Input: [7]
Output: (7, 7)</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10<sup>5</sup></li>
<li>1 ≤ arr[i] ≤ 10<sup>5</sup></li>
</ul>`,
            starterCode: `def highest_lowest_freq(arr):
    """Return (element_with_highest_freq, element_with_lowest_freq).
    If tie, return the smallest element among tied ones."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([1, 2, 2, 3, 3, 3], (3, 1)),
        ([10, 10, 5, 5], (5, 5)),
        ([7], (7, 7)),
        ([1, 1, 2, 2, 3], (1, 3)),
        ([4, 4, 4, 2, 2, 1, 1, 1], (1, 2)),
    ]
    try:
        print(f"highest_lowest_freq([1,2,2,3,3,3]) = {highest_lowest_freq([1,2,2,3,3,3])}")
        print(f"highest_lowest_freq([10,10,5,5]) = {highest_lowest_freq([10,10,5,5])}")
    except Exception as e:
        print(f"ERROR: {e}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (inp, exp) in enumerate(tests):
        try:
            got = highest_lowest_freq(inp[:])
        except Exception as e:
            print(f"Test {i+1}: ERROR ❌  highest_lowest_freq({inp}) → {e}")
            all_pass = False
            continue
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  {inp} → {got}")
        else:
            print(f"Test {i+1}: FAILED ❌  Input: {inp}")
            print(f"  Expected: {exp}")
            print(f"  Got:      {got}")
            all_pass = False
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
        ],
      },
    ],
  },

  // ═══════════════════ STEP 2 ═══════════════════
  {
    id: 'step2',
    step: 2,
    title: 'Sorting Techniques',
    icon: '🔀',
    color: '#8b5cf6',
    topics: [
      {
        label: 'Sorting I',
        problems: [
          {
            title: 'Selection Sort',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Implement <b>Selection Sort</b>. Repeatedly find the <b>minimum element</b> from the unsorted portion and swap it with the first unsorted element.</p>
<p>Return the sorted array.</p>

<h3>Algorithm</h3>
<ol>
<li>For i from 0 to n-1, find the index of the minimum element in arr[i..n-1]</li>
<li>Swap arr[i] with arr[min_idx]</li>
</ol>

<h3>Examples</h3>
<pre>Input: [64, 25, 12, 22, 11]
Output: [11, 12, 22, 25, 64]</pre>
<pre>Input: [5, 4, 3, 2, 1]
Output: [1, 2, 3, 4, 5]</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10000</li>
<li>Must implement Selection Sort (not built-in sort)</li>
</ul>`,
            starterCode: `def selection_sort(arr):
    """Sort the array using Selection Sort and return it."""
    n = len(arr)
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([64, 25, 12, 22, 11], [11, 12, 22, 25, 64]),
        ([5, 4, 3, 2, 1], [1, 2, 3, 4, 5]),
        ([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]),
        ([3, 1], [1, 3]),
        ([1], [1]),
        ([38, 27, 43, 3, 9, 82, 10], [3, 9, 10, 27, 38, 43, 82]),
    ]
    try:
        print(f"selection_sort([64,25,12,22,11]) = {selection_sort([64,25,12,22,11])}")
        print(f"selection_sort([5,4,3,2,1]) = {selection_sort([5,4,3,2,1])}")
    except Exception as e:
        print(f"ERROR: {e}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (inp, exp) in enumerate(tests):
        try:
            got = selection_sort(inp[:])
        except Exception as e:
            print(f"Test {i+1}: ERROR ❌  selection_sort({inp}) → {e}")
            all_pass = False
            continue
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  {inp}")
        else:
            print(f"Test {i+1}: FAILED ❌  Input: {inp}")
            print(f"  Expected: {exp}")
            print(f"  Got:      {got}")
            all_pass = False
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Bubble Sort',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Implement <b>Bubble Sort</b>. Repeatedly swap adjacent elements if they are in the wrong order. After each pass, the largest unsorted element "bubbles up" to its correct position.</p>
<p>Return the sorted array.</p>

<h3>Algorithm</h3>
<ol>
<li>For i from 0 to n-1:</li>
<li>&nbsp;&nbsp;For j from 0 to n-i-2: if arr[j] > arr[j+1], swap them</li>
<li>Optimize: if no swaps in a pass, array is already sorted — break early</li>
</ol>

<h3>Examples</h3>
<pre>Input: [64, 34, 25, 12, 22, 11, 90]
Output: [11, 12, 22, 25, 34, 64, 90]</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10000</li>
<li>Must implement Bubble Sort (not built-in sort)</li>
</ul>`,
            starterCode: `def bubble_sort(arr):
    """Sort the array using Bubble Sort and return it."""
    n = len(arr)
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([64, 34, 25, 12, 22, 11, 90], [11, 12, 22, 25, 34, 64, 90]),
        ([5, 1, 4, 2, 8], [1, 2, 4, 5, 8]),
        ([1, 2, 3], [1, 2, 3]),
        ([3, 2, 1], [1, 2, 3]),
        ([1], [1]),
        ([2, 1], [1, 2]),
    ]
    try:
        print(f"bubble_sort([64,34,25,12,22,11,90]) = {bubble_sort([64,34,25,12,22,11,90])}")
        print(f"bubble_sort([5,1,4,2,8]) = {bubble_sort([5,1,4,2,8])}")
    except Exception as e:
        print(f"ERROR: {e}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (inp, exp) in enumerate(tests):
        try:
            got = bubble_sort(inp[:])
        except Exception as e:
            print(f"Test {i+1}: ERROR ❌  bubble_sort({inp}) → {e}")
            all_pass = False
            continue
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  {inp}")
        else:
            print(f"Test {i+1}: FAILED ❌  Input: {inp}")
            print(f"  Expected: {exp}")
            print(f"  Got:      {got}")
            all_pass = False
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Insertion Sort',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Implement <b>Insertion Sort</b>. Build the sorted array one element at a time by inserting each element into its correct position among the previously sorted elements.</p>
<p>Return the sorted array.</p>

<h3>Algorithm</h3>
<ol>
<li>For i from 1 to n-1:</li>
<li>&nbsp;&nbsp;Take key = arr[i]</li>
<li>&nbsp;&nbsp;Shift all elements in arr[0..i-1] that are greater than key one position right</li>
<li>&nbsp;&nbsp;Place key in the correct position</li>
</ol>

<h3>Examples</h3>
<pre>Input: [12, 11, 13, 5, 6]
Output: [5, 6, 11, 12, 13]</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10000</li>
<li>Must implement Insertion Sort (not built-in sort)</li>
</ul>`,
            starterCode: `def insertion_sort(arr):
    """Sort the array using Insertion Sort and return it."""
    n = len(arr)
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([12, 11, 13, 5, 6], [5, 6, 11, 12, 13]),
        ([5, 4, 3, 2, 1], [1, 2, 3, 4, 5]),
        ([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]),
        ([2, 1], [1, 2]),
        ([1], [1]),
        ([31, 41, 59, 26, 41, 58], [26, 31, 41, 41, 58, 59]),
    ]
    try:
        print(f"insertion_sort([12,11,13,5,6]) = {insertion_sort([12,11,13,5,6])}")
        print(f"insertion_sort([5,4,3,2,1]) = {insertion_sort([5,4,3,2,1])}")
    except Exception as e:
        print(f"ERROR: {e}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (inp, exp) in enumerate(tests):
        try:
            got = insertion_sort(inp[:])
        except Exception as e:
            print(f"Test {i+1}: ERROR ❌  insertion_sort({inp}) → {e}")
            all_pass = False
            continue
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  {inp}")
        else:
            print(f"Test {i+1}: FAILED ❌  Input: {inp}")
            print(f"  Expected: {exp}")
            print(f"  Got:      {got}")
            all_pass = False
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
        ],
      },
      {
        label: 'Sorting II',
        problems: [
          {
            title: 'Merge Sort',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Implement <b>Merge Sort</b> using the <b>divide and conquer</b> approach. Split the array into halves, recursively sort each half, then merge them.</p>
<p>Return the sorted array.</p>

<h3>Algorithm</h3>
<ol>
<li>If array has 0 or 1 elements, it's already sorted — return it</li>
<li>Split into left half and right half</li>
<li>Recursively sort both halves</li>
<li>Merge the two sorted halves using a two-pointer technique</li>
</ol>

<h3>Examples</h3>
<pre>Input: [38, 27, 43, 3, 9, 82, 10]
Output: [3, 9, 10, 27, 38, 43, 82]</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10<sup>5</sup></li>
<li>Time Complexity: O(N log N)</li>
<li>Must implement Merge Sort (not built-in sort)</li>
</ul>`,
            starterCode: `def merge_sort(arr):
    """Sort the array using Merge Sort and return it."""
    # Your code here
    # Hint: split, recurse, merge
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([38, 27, 43, 3, 9, 82, 10], [3, 9, 10, 27, 38, 43, 82]),
        ([5, 4, 3, 2, 1], [1, 2, 3, 4, 5]),
        ([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]),
        ([2, 1], [1, 2]),
        ([1], [1]),
        ([12, 11, 13, 5, 6, 7], [5, 6, 7, 11, 12, 13]),
        (list(range(20, 0, -1)), list(range(1, 21))),
    ]
    try:
        print(f"merge_sort([38,27,43,3,9,82,10]) = {merge_sort([38,27,43,3,9,82,10])}")
        print(f"merge_sort([5,4,3,2,1]) = {merge_sort([5,4,3,2,1])}")
    except Exception as e:
        print(f"ERROR: {e}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (inp, exp) in enumerate(tests):
        try:
            got = merge_sort(inp[:])
        except Exception as e:
            print(f"Test {i+1}: ERROR ❌  merge_sort({inp[:6]}...) → {e}")
            all_pass = False
            continue
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  len={len(inp)}")
        else:
            print(f"Test {i+1}: FAILED ❌  Input: {inp[:6]}{'...' if len(inp)>6 else ''}")
            print(f"  Expected: {exp[:6]}{'...' if len(exp)>6 else ''}")
            print(f"  Got:      {got[:6] if got else got}{'...' if got and len(got)>6 else ''}")
            all_pass = False
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Recursive Bubble Sort',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Implement <b>Bubble Sort</b> using <b>recursion</b> instead of iterative loops.</p>
<p>Return the sorted array.</p>

<h3>Algorithm</h3>
<ol>
<li>Base case: if n == 1, return</li>
<li>Do one pass of bubble sort (swap adjacent if out of order)</li>
<li>The largest element is now at the end</li>
<li>Recursively sort the first n-1 elements</li>
</ol>

<h3>Examples</h3>
<pre>Input: [64, 34, 25, 12]
Output: [12, 25, 34, 64]</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 1000</li>
<li>Must use recursion, no loops for the outer iteration</li>
</ul>`,
            starterCode: `def recursive_bubble_sort(arr):
    """Sort the array using Recursive Bubble Sort and return it."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([64, 34, 25, 12], [12, 25, 34, 64]),
        ([5, 1, 4, 2, 8], [1, 2, 4, 5, 8]),
        ([1, 2, 3], [1, 2, 3]),
        ([3, 2, 1], [1, 2, 3]),
        ([1], [1]),
        ([10, 5, 3, 8, 2, 6, 1], [1, 2, 3, 5, 6, 8, 10]),
    ]
    try:
        print(f"recursive_bubble_sort([64,34,25,12]) = {recursive_bubble_sort([64,34,25,12])}")
        print(f"recursive_bubble_sort([5,1,4,2,8]) = {recursive_bubble_sort([5,1,4,2,8])}")
    except Exception as e:
        print(f"ERROR: {e}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (inp, exp) in enumerate(tests):
        try:
            got = recursive_bubble_sort(inp[:])
        except Exception as e:
            print(f"Test {i+1}: ERROR ❌  recursive_bubble_sort({inp}) → {e}")
            all_pass = False
            continue
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  {inp}")
        else:
            print(f"Test {i+1}: FAILED ❌  Input: {inp}")
            print(f"  Expected: {exp}")
            print(f"  Got:      {got}")
            all_pass = False
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Recursive Insertion Sort',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Implement <b>Insertion Sort</b> using <b>recursion</b> instead of iterative loops.</p>
<p>Return the sorted array.</p>

<h3>Algorithm</h3>
<ol>
<li>Base case: if n ≤ 1, return</li>
<li>Recursively sort the first n-1 elements</li>
<li>Insert the nth element into its correct position in the sorted portion</li>
</ol>

<h3>Examples</h3>
<pre>Input: [12, 11, 13, 5, 6]
Output: [5, 6, 11, 12, 13]</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 1000</li>
<li>Must use recursion, no loops for the outer iteration</li>
</ul>`,
            starterCode: `def recursive_insertion_sort(arr):
    """Sort the array using Recursive Insertion Sort and return it."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([12, 11, 13, 5, 6], [5, 6, 11, 12, 13]),
        ([5, 4, 3, 2, 1], [1, 2, 3, 4, 5]),
        ([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]),
        ([2, 1], [1, 2]),
        ([1], [1]),
        ([31, 41, 59, 26, 41, 58], [26, 31, 41, 41, 58, 59]),
    ]
    try:
        print(f"recursive_insertion_sort([12,11,13,5,6]) = {recursive_insertion_sort([12,11,13,5,6])}")
        print(f"recursive_insertion_sort([5,4,3,2,1]) = {recursive_insertion_sort([5,4,3,2,1])}")
    except Exception as e:
        print(f"ERROR: {e}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (inp, exp) in enumerate(tests):
        try:
            got = recursive_insertion_sort(inp[:])
        except Exception as e:
            print(f"Test {i+1}: ERROR ❌  recursive_insertion_sort({inp}) → {e}")
            all_pass = False
            continue
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  {inp}")
        else:
            print(f"Test {i+1}: FAILED ❌  Input: {inp}")
            print(f"  Expected: {exp}")
            print(f"  Got:      {got}")
            all_pass = False
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Quick Sort',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Implement <b>Quick Sort</b> using the <b>divide and conquer</b> approach. Pick a <b>pivot</b>, partition the array around it, then recursively sort the partitions.</p>
<p>Return the sorted array.</p>

<h3>Algorithm</h3>
<ol>
<li>Base case: if array has 0 or 1 elements, return it</li>
<li>Pick a pivot (first element, last element, or median)</li>
<li>Partition: elements ≤ pivot go left, elements > pivot go right</li>
<li>Recursively sort left and right partitions</li>
<li>Combine: left + [pivot] + right</li>
</ol>

<h3>Examples</h3>
<pre>Input: [10, 7, 8, 9, 1, 5]
Output: [1, 5, 7, 8, 9, 10]</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10<sup>5</sup></li>
<li>Average Time Complexity: O(N log N)</li>
<li>Must implement Quick Sort (not built-in sort)</li>
</ul>`,
            starterCode: `def quick_sort(arr):
    """Sort the array using Quick Sort and return it."""
    # Your code here
    # Hint: pick pivot, partition into left/right, recurse, combine
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([10, 7, 8, 9, 1, 5], [1, 5, 7, 8, 9, 10]),
        ([5, 4, 3, 2, 1], [1, 2, 3, 4, 5]),
        ([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]),
        ([3, 1], [1, 3]),
        ([1], [1]),
        ([38, 27, 43, 3, 9, 82, 10], [3, 9, 10, 27, 38, 43, 82]),
        (list(range(20, 0, -1)), list(range(1, 21))),
    ]
    try:
        print(f"quick_sort([10,7,8,9,1,5]) = {quick_sort([10,7,8,9,1,5])}")
        print(f"quick_sort([5,4,3,2,1]) = {quick_sort([5,4,3,2,1])}")
    except Exception as e:
        print(f"ERROR: {e}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (inp, exp) in enumerate(tests):
        try:
            got = quick_sort(inp[:])
        except Exception as e:
            print(f"Test {i+1}: ERROR ❌  quick_sort({inp[:6]}...) → {e}")
            all_pass = False
            continue
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  len={len(inp)}")
        else:
            print(f"Test {i+1}: FAILED ❌  Input: {inp[:6]}{'...' if len(inp)>6 else ''}")
            print(f"  Expected: {exp[:6]}{'...' if len(exp)>6 else ''}")
            print(f"  Got:      {got[:6] if got else got}{'...' if got and len(got)>6 else ''}")
            all_pass = False
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
        ],
      },
    ],
  },

  // ═══════════════════ STEP 3 ═══════════════════
  {
    id: 'step3',
    step: 3,
    title: 'Solve Problems on Arrays',
    icon: '📊',
    color: '#06b6d4',
    topics: [
      {
        label: 'Easy',
        problems: [
          {
            title: 'Largest Element in an Array',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given an array <code>arr</code> of size <code>N</code>, find and return the <b>largest element</b> in the array.</p>

<h3>Examples</h3>
<pre>Input: arr = [3, 5, 2, 8, 1]
Output: 8</pre>
<pre>Input: arr = [10, 10, 10]
Output: 10</pre>
<pre>Input: arr = [-1, -5, -3]
Output: -1</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10⁵</li>
<li>-10⁹ ≤ arr[i] ≤ 10⁹</li>
</ul>`,
            starterCode: `def largest_element(arr):
    """Return the largest element in the array."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([3, 5, 2, 8, 1], 8),
        ([10, 10, 10], 10),
        ([-1, -5, -3], -1),
        ([1], 1),
        ([100, 200, 50, 300, 250], 300),
    ]
    print(f"largest_element({tests[-1][0]}) = {largest_element(tests[-1][0])}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (arr, exp) in enumerate(tests):
        got = largest_element(arr)
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  arr={arr}")
        else:
            all_pass = False
            print(f"Test {i+1}: FAILED ❌  arr={arr}")
            print(f"  Expected: {exp}")
            print(f"  Got: {got}")
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Second Largest Element',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given an array <code>arr</code> of size <code>N</code>, find and return the <b>second largest distinct element</b>. If no second largest exists, return <code>-1</code>.</p>

<h3>Examples</h3>
<pre>Input: arr = [12, 35, 1, 10, 34, 1]
Output: 34</pre>
<pre>Input: arr = [10, 10, 10]
Output: -1</pre>
<pre>Input: arr = [5, 8]
Output: 5</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10⁵</li>
<li>-10⁹ ≤ arr[i] ≤ 10⁹</li>
</ul>`,
            starterCode: `def second_largest(arr):
    """Return the second largest distinct element, or -1 if not exists."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([12, 35, 1, 10, 34, 1], 34),
        ([10, 10, 10], -1),
        ([5, 8], 5),
        ([1], -1),
        ([7, 7, 3, 2, 7], 3),
        ([-1, -5, -3], -3),
    ]
    print(f"second_largest({tests[0][0]}) = {second_largest(tests[0][0])}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (arr, exp) in enumerate(tests):
        got = second_largest(arr)
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  arr={arr}")
        else:
            all_pass = False
            print(f"Test {i+1}: FAILED ❌  arr={arr}")
            print(f"  Expected: {exp}")
            print(f"  Got: {got}")
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Check if Array is Sorted',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given an array <code>arr</code>, check if it is sorted in <b>non-decreasing order</b>. Return <code>True</code> or <code>False</code>.</p>

<h3>Examples</h3>
<pre>Input: arr = [1, 2, 3, 4, 5]
Output: True</pre>
<pre>Input: arr = [1, 3, 2, 4, 5]
Output: False</pre>
<pre>Input: arr = [5, 5, 5]
Output: True</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10⁵</li>
</ul>`,
            starterCode: `def is_sorted(arr):
    """Return True if array is sorted in non-decreasing order."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([1, 2, 3, 4, 5], True),
        ([1, 3, 2, 4, 5], False),
        ([5, 5, 5], True),
        ([1], True),
        ([], True),
        ([5, 4, 3, 2, 1], False),
    ]
    print(f"is_sorted({tests[0][0]}) = {is_sorted(tests[0][0])}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (arr, exp) in enumerate(tests):
        got = is_sorted(arr)
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  arr={arr}")
        else:
            all_pass = False
            print(f"Test {i+1}: FAILED ❌  arr={arr}")
            print(f"  Expected: {exp}")
            print(f"  Got: {got}")
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Remove Duplicates from Sorted Array',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given a <b>sorted</b> array <code>arr</code>, remove the duplicates <b>in-place</b> such that each element appears only once. Return the number of unique elements <code>k</code>. The first <code>k</code> elements of <code>arr</code> should hold the unique elements.</p>

<h3>Examples</h3>
<pre>Input: arr = [1, 1, 2, 2, 3]
Output: 3, arr = [1, 2, 3, ...]</pre>
<pre>Input: arr = [1, 1, 1]
Output: 1, arr = [1, ...]</pre>
<pre>Input: arr = [1, 2, 3]
Output: 3, arr = [1, 2, 3]</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10⁵</li>
<li>Array is sorted in non-decreasing order</li>
</ul>`,
            starterCode: `def remove_duplicates(arr):
    """Remove duplicates in-place. Return count of unique elements."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([1, 1, 2, 2, 3], 3, [1, 2, 3]),
        ([1, 1, 1], 1, [1]),
        ([1, 2, 3], 3, [1, 2, 3]),
        ([0, 0, 0, 1, 1, 2, 2, 3, 3, 4], 5, [0, 1, 2, 3, 4]),
        ([1], 1, [1]),
    ]
    t = tests[0]
    a = t[0][:]
    print(f"remove_duplicates({t[0]}) = {remove_duplicates(a)}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (arr, exp_k, exp_arr) in enumerate(tests):
        a = arr[:]
        got_k = remove_duplicates(a)
        if got_k == exp_k and a[:got_k] == exp_arr:
            print(f"Test {i+1}: PASSED ✅  arr={arr}")
        else:
            all_pass = False
            print(f"Test {i+1}: FAILED ❌  arr={arr}")
            print(f"  Expected: k={exp_k}, first k={exp_arr}")
            print(f"  Got: k={got_k}, first k={a[:got_k] if got_k else []}")
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Left Rotate an Array by One Place',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given an array <code>arr</code>, left rotate it by <b>one place</b>. The first element moves to the end.</p>

<h3>Examples</h3>
<pre>Input: arr = [1, 2, 3, 4, 5]
Output: [2, 3, 4, 5, 1]</pre>
<pre>Input: arr = [10]
Output: [10]</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10⁵</li>
</ul>`,
            starterCode: `def left_rotate_one(arr):
    """Left rotate the array by one place. Return the modified array."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([1, 2, 3, 4, 5], [2, 3, 4, 5, 1]),
        ([10], [10]),
        ([1, 2], [2, 1]),
        ([5, 4, 3, 2, 1], [4, 3, 2, 1, 5]),
    ]
    print(f"left_rotate_one({tests[0][0]}) = {left_rotate_one(tests[0][0][:])}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (arr, exp) in enumerate(tests):
        got = left_rotate_one(arr[:])
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  arr={arr}")
        else:
            all_pass = False
            print(f"Test {i+1}: FAILED ❌  arr={arr}")
            print(f"  Expected: {exp}")
            print(f"  Got: {got}")
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Left Rotate an Array by K Places',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given an array <code>arr</code> and an integer <code>k</code>, left rotate the array by <code>k</code> places.</p>

<h3>Examples</h3>
<pre>Input: arr = [1, 2, 3, 4, 5], k = 2
Output: [3, 4, 5, 1, 2]</pre>
<pre>Input: arr = [1, 2, 3], k = 4
Output: [2, 3, 1]</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10⁵</li>
<li>0 ≤ k ≤ 10⁹</li>
</ul>`,
            starterCode: `def left_rotate_k(arr, k):
    """Left rotate the array by k places. Return the modified array."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([1, 2, 3, 4, 5], 2, [3, 4, 5, 1, 2]),
        ([1, 2, 3], 4, [2, 3, 1]),
        ([1, 2, 3, 4, 5], 0, [1, 2, 3, 4, 5]),
        ([1, 2, 3, 4, 5], 5, [1, 2, 3, 4, 5]),
        ([10, 20], 1, [20, 10]),
    ]
    print(f"left_rotate_k({tests[0][0]}, {tests[0][1]}) = {left_rotate_k(tests[0][0][:], tests[0][1])}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (arr, k, exp) in enumerate(tests):
        got = left_rotate_k(arr[:], k)
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  arr={arr}, k={k}")
        else:
            all_pass = False
            print(f"Test {i+1}: FAILED ❌  arr={arr}, k={k}")
            print(f"  Expected: {exp}")
            print(f"  Got: {got}")
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Move Zeros to End',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given an array <code>arr</code>, move all <code>0</code>s to the end while maintaining the relative order of non-zero elements. Do it <b>in-place</b>.</p>

<h3>Examples</h3>
<pre>Input: arr = [0, 1, 0, 3, 12]
Output: [1, 3, 12, 0, 0]</pre>
<pre>Input: arr = [0, 0, 0]
Output: [0, 0, 0]</pre>
<pre>Input: arr = [1, 2, 3]
Output: [1, 2, 3]</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10⁵</li>
</ul>`,
            starterCode: `def move_zeros(arr):
    """Move all zeros to the end in-place. Return the modified array."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([0, 1, 0, 3, 12], [1, 3, 12, 0, 0]),
        ([0, 0, 0], [0, 0, 0]),
        ([1, 2, 3], [1, 2, 3]),
        ([0], [0]),
        ([1, 0, 2, 0, 3, 0], [1, 2, 3, 0, 0, 0]),
    ]
    print(f"move_zeros({tests[0][0]}) = {move_zeros(tests[0][0][:])}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (arr, exp) in enumerate(tests):
        got = move_zeros(arr[:])
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  arr={arr}")
        else:
            all_pass = False
            print(f"Test {i+1}: FAILED ❌  arr={arr}")
            print(f"  Expected: {exp}")
            print(f"  Got: {got}")
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Linear Search',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given an array <code>arr</code> and a target <code>x</code>, return the <b>first index</b> where <code>x</code> is found. If not found, return <code>-1</code>.</p>

<h3>Examples</h3>
<pre>Input: arr = [1, 2, 3, 4, 5], x = 3
Output: 2</pre>
<pre>Input: arr = [5, 4, 3, 2, 1], x = 6
Output: -1</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10⁵</li>
</ul>`,
            starterCode: `def linear_search(arr, x):
    """Return the first index of x in arr, or -1 if not found."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([1, 2, 3, 4, 5], 3, 2),
        ([5, 4, 3, 2, 1], 6, -1),
        ([10, 20, 30], 10, 0),
        ([10, 20, 30], 30, 2),
        ([1, 1, 1], 1, 0),
    ]
    print(f"linear_search({tests[0][0]}, {tests[0][1]}) = {linear_search(tests[0][0], tests[0][1])}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (arr, x, exp) in enumerate(tests):
        got = linear_search(arr, x)
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  arr={arr}, x={x}")
        else:
            all_pass = False
            print(f"Test {i+1}: FAILED ❌  arr={arr}, x={x}")
            print(f"  Expected: {exp}")
            print(f"  Got: {got}")
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Union of Two Sorted Arrays',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given two <b>sorted</b> arrays <code>a</code> and <code>b</code>, return a new sorted array containing the <b>union</b> of both (no duplicates).</p>

<h3>Examples</h3>
<pre>Input: a = [1, 2, 3, 4, 5], b = [2, 3, 4, 4, 5]
Output: [1, 2, 3, 4, 5]</pre>
<pre>Input: a = [1, 1, 1], b = [2, 2, 2]
Output: [1, 2]</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N, M ≤ 10⁵</li>
<li>Both arrays are sorted in non-decreasing order</li>
</ul>`,
            starterCode: `def union_sorted(a, b):
    """Return the sorted union of two sorted arrays (no duplicates)."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([1, 2, 3, 4, 5], [2, 3, 4, 4, 5], [1, 2, 3, 4, 5]),
        ([1, 1, 1], [2, 2, 2], [1, 2]),
        ([1, 2, 3], [4, 5, 6], [1, 2, 3, 4, 5, 6]),
        ([1, 3, 5], [2, 4, 6], [1, 2, 3, 4, 5, 6]),
        ([1], [1], [1]),
    ]
    print(f"union_sorted({tests[0][0]}, {tests[0][1]}) = {union_sorted(tests[0][0], tests[0][1])}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (a, b, exp) in enumerate(tests):
        got = union_sorted(a, b)
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  a={a}, b={b}")
        else:
            all_pass = False
            print(f"Test {i+1}: FAILED ❌  a={a}, b={b}")
            print(f"  Expected: {exp}")
            print(f"  Got: {got}")
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Find Missing Number in an Array',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given an array <code>arr</code> containing <code>N-1</code> distinct integers in the range <code>[0, N]</code>, find the <b>one missing number</b>.</p>

<h3>Examples</h3>
<pre>Input: arr = [3, 0, 1]
Output: 2</pre>
<pre>Input: arr = [0, 1]
Output: 2</pre>
<pre>Input: arr = [9, 6, 4, 2, 3, 5, 7, 0, 1]
Output: 8</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10⁵</li>
<li>All numbers are distinct</li>
</ul>

<h3>Hint</h3>
<p>Think about the sum formula: <code>N*(N+1)/2</code>, or use XOR.</p>`,
            starterCode: `def missing_number(arr):
    """Find the missing number in range [0, N] where len(arr) = N-1... actually len(arr) = N and range is [0, N]."""
    # N = len(arr), range is [0, N]
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([3, 0, 1], 2),
        ([0, 1], 2),
        ([9, 6, 4, 2, 3, 5, 7, 0, 1], 8),
        ([0], 1),
        ([1, 2, 3, 4, 5], 0),
    ]
    print(f"missing_number({tests[0][0]}) = {missing_number(tests[0][0])}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (arr, exp) in enumerate(tests):
        got = missing_number(arr)
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  arr={arr}")
        else:
            all_pass = False
            print(f"Test {i+1}: FAILED ❌  arr={arr}")
            print(f"  Expected: {exp}")
            print(f"  Got: {got}")
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Maximum Consecutive Ones',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given a binary array <code>arr</code> (containing only 0s and 1s), find the <b>maximum number of consecutive 1s</b>.</p>

<h3>Examples</h3>
<pre>Input: arr = [1, 1, 0, 1, 1, 1]
Output: 3</pre>
<pre>Input: arr = [0, 0, 0]
Output: 0</pre>
<pre>Input: arr = [1, 1, 1, 1]
Output: 4</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10⁵</li>
<li>arr[i] is 0 or 1</li>
</ul>`,
            starterCode: `def max_consecutive_ones(arr):
    """Return the maximum number of consecutive 1s in the binary array."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([1, 1, 0, 1, 1, 1], 3),
        ([0, 0, 0], 0),
        ([1, 1, 1, 1], 4),
        ([1, 0, 1, 0, 1], 1),
        ([0, 1, 1, 0, 1, 1, 1, 0], 3),
    ]
    print(f"max_consecutive_ones({tests[0][0]}) = {max_consecutive_ones(tests[0][0])}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (arr, exp) in enumerate(tests):
        got = max_consecutive_ones(arr)
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  arr={arr}")
        else:
            all_pass = False
            print(f"Test {i+1}: FAILED ❌  arr={arr}")
            print(f"  Expected: {exp}")
            print(f"  Got: {got}")
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Find the number that appears once',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given an array where every element appears <b>twice</b> except for one element which appears <b>once</b>, find that single element.</p>

<h3>Examples</h3>
<pre>Input: arr = [2, 2, 1]
Output: 1</pre>
<pre>Input: arr = [4, 1, 2, 1, 2]
Output: 4</pre>
<pre>Input: arr = [1]
Output: 1</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10⁵ (N is always odd)</li>
<li>Every element appears exactly twice except one</li>
</ul>

<h3>Hint</h3>
<p>XOR of a number with itself is 0. XOR of a number with 0 is the number itself.</p>`,
            starterCode: `def single_number(arr):
    """Find the element that appears only once (all others appear twice)."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([2, 2, 1], 1),
        ([4, 1, 2, 1, 2], 4),
        ([1], 1),
        ([3, 3, 7, 7, 10, 11, 11], 10),
        ([5, 1, 5, 2, 2], 1),
    ]
    print(f"single_number({tests[0][0]}) = {single_number(tests[0][0])}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (arr, exp) in enumerate(tests):
        got = single_number(arr)
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  arr={arr}")
        else:
            all_pass = False
            print(f"Test {i+1}: FAILED ❌  arr={arr}")
            print(f"  Expected: {exp}")
            print(f"  Got: {got}")
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Longest Subarray with given Sum K (positives)',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Given an array of <b>positive integers</b> <code>arr</code> and a target sum <code>k</code>, find the <b>length of the longest subarray</b> whose sum equals <code>k</code>. If no such subarray exists, return <code>0</code>.</p>

<h3>Examples</h3>
<pre>Input: arr = [1, 2, 3, 1, 1, 1, 1], k = 3
Output: 3  (subarray [1, 1, 1])</pre>
<pre>Input: arr = [2, 3, 5], k = 5
Output: 2  (subarray [2, 3])</pre>
<pre>Input: arr = [1, 1, 1], k = 10
Output: 0</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10⁵</li>
<li>1 ≤ arr[i] ≤ 10⁶ (all positive)</li>
<li>1 ≤ k ≤ 10⁹</li>
</ul>`,
            starterCode: `def longest_subarray_sum_k(arr, k):
    """Return length of longest subarray with sum equal to k (positive integers only)."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([1, 2, 3, 1, 1, 1, 1], 3, 3),
        ([2, 3, 5], 5, 2),
        ([1, 1, 1], 10, 0),
        ([1, 2, 1, 3], 4, 3),
        ([5], 5, 1),
        ([1, 1, 1, 1, 1], 3, 3),
    ]
    print(f"longest_subarray_sum_k({tests[0][0]}, {tests[0][1]}) = {longest_subarray_sum_k(tests[0][0], tests[0][1])}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (arr, k, exp) in enumerate(tests):
        got = longest_subarray_sum_k(arr, k)
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  arr={arr}, k={k}")
        else:
            all_pass = False
            print(f"Test {i+1}: FAILED ❌  arr={arr}, k={k}")
            print(f"  Expected: {exp}")
            print(f"  Got: {got}")
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Longest Subarray with given Sum K (positives + negatives)',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Given an array <code>arr</code> (which can contain <b>positive, negative, and zero</b> values) and a target sum <code>k</code>, find the <b>length of the longest subarray</b> whose sum equals <code>k</code>.</p>

<h3>Examples</h3>
<pre>Input: arr = [2, 0, 0, 3], k = 3
Output: 3  (subarray [0, 0, 3])</pre>
<pre>Input: arr = [-1, 1, 1], k = 1
Output: 3  (subarray [-1, 1, 1])</pre>
<pre>Input: arr = [1, -1, 5, -2, 3], k = 3
Output: 4  (subarray [1, -1, 5, -2])</pre>

<h3>Constraints</h3>
<ul>
<li>1 ≤ N ≤ 10⁵</li>
<li>-10⁶ ≤ arr[i] ≤ 10⁶</li>
</ul>

<h3>Hint</h3>
<p>Use a prefix sum with a hash map. Store the first occurrence of each prefix sum.</p>`,
            starterCode: `def longest_subarray_sum_k(arr, k):
    """Return length of longest subarray with sum k (array can have negatives)."""
    # Your code here
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    tests = [
        ([2, 0, 0, 3], 3, 3),
        ([-1, 1, 1], 1, 3),
        ([1, -1, 5, -2, 3], 3, 4),
        ([1, 2, 3], 10, 0),
        ([0, 0, 0, 0], 0, 4),
        ([1, -1, 1, -1, 1], 0, 4),
    ]
    print(f"longest_subarray_sum_k({tests[0][0]}, {tests[0][1]}) = {longest_subarray_sum_k(tests[0][0], tests[0][1])}")
    print("═══TEST_RESULTS═══")
    all_pass = True
    for i, (arr, k, exp) in enumerate(tests):
        got = longest_subarray_sum_k(arr, k)
        if got == exp:
            print(f"Test {i+1}: PASSED ✅  arr={arr}, k={k}")
        else:
            all_pass = False
            print(f"Test {i+1}: FAILED ❌  arr={arr}, k={k}")
            print(f"  Expected: {exp}")
            print(f"  Got: {got}")
    if all_pass:
        print("\\n🎉 All tests passed!")
`,
          },
        ],
      },
      {
        label: 'Medium',
        problems: [
          {
            title: 'Two Sum',
            difficulty: 'Easy',
            description: `<h3>Problem</h3><p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return the <b>indices</b> of the two numbers such that they add up to <code>target</code>.</p><p>You may assume that each input has <b>exactly one solution</b>, and you may not use the same element twice.</p><p>You can return the answer in <b>any order</b>.</p><h3>Examples</h3><pre>Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1]
Explanation: nums[0] + nums[1] = 2 + 7 = 9</pre><pre>Input: nums = [3, 2, 4], target = 6
Output: [1, 2]
Explanation: nums[1] + nums[2] = 2 + 4 = 6</pre><pre>Input: nums = [3, 3], target = 6
Output: [0, 1]
Explanation: nums[0] + nums[1] = 3 + 3 = 6</pre><h3>Constraints</h3><ul><li><code>2 &lt;= len(nums) &lt;= 10<sup>4</sup></code></li><li><code>-10<sup>9</sup> &lt;= nums[i] &lt;= 10<sup>9</sup></code></li><li><code>-10<sup>9</sup> &lt;= target &lt;= 10<sup>9</sup></code></li><li>Only <b>one valid answer</b> exists.</li></ul>`,
            starterCode: `def two_sum(nums, target):
    """
    Given an array of integers nums and an integer target,
    return indices of the two numbers that add up to target.
    
    Args:
        nums: List[int] - array of integers
        target: int - target sum
    Returns:
        List[int] - indices of the two numbers
    """
    pass


# --- Test cases (do not modify) ---
print("Sample calls:")
print(f"two_sum([2, 7, 11, 15], 9) = {two_sum([2, 7, 11, 15], 9)}")
print(f"two_sum([3, 2, 4], 6) = {two_sum([3, 2, 4], 6)}")
print(f"two_sum([3, 3], 6) = {two_sum([3, 3], 6)}")

print("\\n═══TEST_RESULTS═══")

def check(test_num, nums, target, expected):
    result = two_sum(nums, target)
    if result is not None:
        result = sorted(result)
    expected = sorted(expected)
    if result == expected:
        print(f"Test {test_num}: PASSED ✅")
        return True
    else:
        print(f"Test {test_num}: FAILED ❌ (expected {expected}, got {result})")
        return False

results = []

# Test 1: Basic case
results.append(check(1, [2, 7, 11, 15], 9, [0, 1]))

# Test 2: Target pair not at start
results.append(check(2, [3, 2, 4], 6, [1, 2]))

# Test 3: Duplicate values
results.append(check(3, [3, 3], 6, [0, 1]))

# Test 4: Two elements only
results.append(check(4, [1, 4], 5, [0, 1]))

# Test 5: Negative numbers
results.append(check(5, [-1, -2, -3, -4, -5], -8, [2, 4]))

# Test 6: Mix of negative and positive
results.append(check(6, [-3, 4, 3, 90], 0, [0, 2]))

# Test 7: Target is zero with negatives
results.append(check(7, [0, 4, 3, 0], 0, [0, 3]))

# Test 8: Large values near constraint limits
results.append(check(8, [1000000000, -1000000000, 3, 5], 0, [0, 1]))

# Test 9: Pair at the very end of array
results.append(check(9, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 19, [8, 9]))

# Test 10: All same elements except answer pair uses duplicates
results.append(check(10, [5, 5, 5, 5], 10, [0, 1]))

# Test 11: Answer involves zero
results.append(check(11, [0, 8, 7, 3, 2], 8, [0, 1]))

# Test 12: Negative target
results.append(check(12, [1, -7, 10, -3], -10, [1, 3]))

all_pass = all(results)
if all_pass:
    print("\\n🎉 All tests passed!")
`,
          },
          {
            title: 'Sort an Array of 0s 1s and 2s',
            difficulty: 'Medium',
            description: `<h3>Problem</h3><p>Given an array containing only the integers <code>0</code>, <code>1</code>, and <code>2</code>, sort the array so that all <code>0</code>s come first, followed by all <code>1</code>s, and finally all <code>2</code>s.</p><p><b>Note:</b> You can solve this problem in-place with <code>O(n)</code> time and <code>O(1)</code> space using the Dutch National Flag algorithm.</p><h3>Examples</h3><pre>Input: [2, 0, 2, 1, 1, 0]
Output: [0, 0, 1, 1, 2, 2]
Explanation: All 0s are at the beginning, followed by 1s, then 2s.</pre><pre>Input: [2, 2, 1, 1, 0, 0]
Output: [0, 0, 1, 1, 2, 2]
Explanation: Already contains grouped elements, but out of order.</pre><pre>Input: [0, 1, 2]
Output: [0, 1, 2]
Explanation: Already sorted.</pre><h3>Constraints</h3><ul><li>1 &lt;= len(arr) &lt;= 10<sup>5</sup></li><li>Each element in arr is either 0, 1, or 2</li><li>You may modify the array in-place</li></ul>`,
            starterCode: `def sortArray(arr):
    """
    Sort an array containing only 0s, 1s, and 2s.
    
    This is the Dutch National Flag problem. You can sort the array
    in-place by using three pointers (low, mid, high) or by counting
    occurrences of each number.
    
    Args:
        arr: List of integers containing only 0, 1, or 2
        
    Returns:
        List with all 0s first, then 1s, then 2s
    """
    pass


# --- Test cases (do not modify) ---

# Sample calls
print("Sample calls:")
print(f"sortArray([2, 0, 2, 1, 1, 0]) = {sortArray([2, 0, 2, 1, 1, 0])}")
print(f"sortArray([0, 0, 1, 2, 2, 1]) = {sortArray([0, 0, 1, 2, 2, 1])}")
print(f"sortArray([1]) = {sortArray([1])}")
print()
print("═══TEST_RESULTS═══")

test_cases = [
    ([2, 0, 2, 1, 1, 0], [0, 0, 1, 1, 2, 2]),  # Mixed array
    ([0], [0]),  # Single element - zero
    ([1], [1]),  # Single element - one
    ([2], [2]),  # Single element - two
    ([0, 0, 0], [0, 0, 0]),  # All zeros
    ([1, 1, 1], [1, 1, 1]),  # All ones
    ([2, 2, 2], [2, 2, 2]),  # All twos
    ([0, 0, 1, 1, 2, 2], [0, 0, 1, 1, 2, 2]),  # Already sorted
    ([2, 2, 1, 1, 0, 0], [0, 0, 1, 1, 2, 2]),  # Reverse sorted
    ([1, 0], [0, 1]),  # Two elements
    ([2, 1], [1, 2]),  # Two elements
    ([1, 2, 0, 1, 2, 0, 2, 1, 0], [0, 0, 0, 1, 1, 1, 2, 2, 2]),  # Larger mixed
]

all_pass = True
for i, (input_arr, expected) in enumerate(test_cases, 1):
    result = sortArray(input_arr)
    if result == expected:
        print(f"Test {i}: PASSED ✅")
    else:
        print(f"Test {i}: FAILED ❌")
        print(f"  Input: {input_arr}")
        print(f"  Expected: {expected}")
        print(f"  Got: {result}")
        all_pass = False

if all_pass:
    print("\\n🎉 All tests passed!")`,
          },
          {
            title: 'Majority Element (> n/2 times)',
            difficulty: 'Medium',
            description: `<h3>Problem</h3><p>Given an array <code>nums</code> of size <code>n</code>, return the majority element.</p><p>The majority element is the element that appears more than <code>⌊n / 2⌋</code> times. You may assume that the majority element always exists in the array.</p><h3>Examples</h3><pre>Input: nums = [3,2,3]\nOutput: 3</pre><pre>Input: nums = [2,2,1,1,1,2,2]\nOutput: 2</pre><h3>Constraints</h3><ul><li><code>n == nums.length</code></li><li><code>1 &lt;= n &lt;= 5 * 10<sup>4</sup></code></li></ul>`,
            starterCode: `def majorityElement(nums):
    """
    Find the majority element in the array (appears > n/2 times).
    """
    pass

# --- Test cases ---
print("Testing majorityElement...")
tests = [([3,2,3], 3), ([2,2,1,1,1,2,2], 2), ([1], 1)]
all_pass = True
for nums, exp in tests:
    res = majorityElement(nums)
    if res != exp:
        print(f"❌ FAILED for {nums}: expected {exp}, got {res}")
        all_pass = False
if all_pass: print("✅ All tests passed!")`
          },
          {
            title: "Kadane Algorithm — Maximum Subarray Sum",
            difficulty: 'Medium',
            description: `<h3>Problem</h3><p>Given an integer array <code>nums</code>, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.</p><h3>Examples</h3><pre>Input: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\nExplanation: [4,-1,2,1] has the largest sum = 6.</pre><pre>Input: nums = [1]\nOutput: 1</pre><h3>Constraints</h3><ul><li><code>1 &lt;= nums.length &lt;= 10<sup>5</sup></code></li><li><code>-10<sup>4</sup> &lt;= nums[i] &lt;= 10<sup>4</sup></code></li></ul>`,
            starterCode: `def maxSubArray(nums):
    """
    Find the contiguous subarray with the largest sum and return its sum.
    """
    pass

# --- Test cases ---
print("Testing maxSubArray...")
tests = [([-2,1,-3,4,-1,2,1,-5,4], 6), ([1], 1), ([5,4,-1,7,8], 23), ([-1,-2,-3], -1)]
all_pass = True
for nums, exp in tests:
    res = maxSubArray(nums)
    if res != exp:
        print(f"❌ FAILED for {nums}: expected {exp}, got {res}")
        all_pass = False
if all_pass: print("✅ All tests passed!")`
          },
          {
            title: 'Print Subarray with Maximum Sum',
            difficulty: 'Medium',
            description: `<h3>Problem</h3><p>Instead of just the sum, return the actual contiguous subarray that has the maximum sum.</p><h3>Examples</h3><pre>Input: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: [4,-1,2,1]</pre><h3>Constraints</h3><ul><li><code>1 &lt;= nums.length &lt;= 10<sup>5</sup></code></li></ul>`,
            starterCode: `def getMaximumSubarray(nums):
    """
    Return the contiguous subarray with the largest sum.
    """
    pass

# --- Test cases ---
print("Testing getMaximumSubarray...")
tests = [([-2,1,-3,4,-1,2,1,-5,4], [4,-1,2,1]), ([1], [1]), ([-1,-2,-3], [-1])]
all_pass = True
for nums, exp in tests:
    res = getMaximumSubarray(nums)
    if res != exp:
        print(f"❌ FAILED for {nums}: expected {exp}, got {res}")
        all_pass = False
if all_pass: print("✅ All tests passed!")`
          },
          {
            title: 'Stock Buy and Sell',
            difficulty: 'Easy',
            description: `<h3>Problem</h3><p>You are given an array <code>prices</code> where <code>prices[i]</code> is the price of a given stock on the <code>i<sup>th</sup></code> day.</p><p>You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.</p><p>Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.</p><h3>Examples</h3><pre>Input: prices = [7,1,5,3,6,4]\nOutput: 5\nExplanation: Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.</pre><h3>Constraints</h3><ul><li><code>1 &lt;= prices.length &lt;= 10<sup>5</sup></code></li><li><code>0 &lt;= prices[i] &lt;= 10<sup>4</sup></code></li></ul>`,
            starterCode: `def maxProfit(prices):
    """
    Return the maximum profit achievable by buying and selling once.
    """
    pass

# --- Test cases ---
print("Testing maxProfit...")
tests = [([7,1,5,3,6,4], 5), ([7,6,4,3,1], 0)]
all_pass = True
for prices, exp in tests:
    res = maxProfit(prices)
    if res != exp:
        print(f"❌ FAILED for {prices}: expected {exp}, got {res}")
        all_pass = False
if all_pass: print("✅ All tests passed!")`
          },
          {
            title: 'Rearrange Array Elements by Sign',
            difficulty: 'Medium',
            description: `<h3>Problem</h3><p>You are given a 0-indexed integer array <code>nums</code> of even length consisting of an equal number of positive and negative integers.</p><p>Rearrange the elements of <code>nums</code> such that the modified array follows the given conditions:</p><ol><li>Every consecutive pair of integers have opposite signs.</li><li>For all integers with the same sign, the order in which they were present in <code>nums</code> is preserved.</li><li>The rearranged array begins with a positive integer.</li></ol><h3>Examples</h3><pre>Input: nums = [3,1,-2,-5,2,-4]\nOutput: [3,-2,1,-5,2,-4]</pre><h3>Constraints</h3><ul><li><code>2 &lt;= nums.length &lt;= 2 * 10<sup>5</sup></code></li><li><code>nums.length</code> is even</li></ul>`,
            starterCode: `def rearrangeArray(nums):
    """
    Rearrange the array elements by alternating positive and negative signs.
    """
    pass

# --- Test cases ---
print("Testing rearrangeArray...")
tests = [([3,1,-2,-5,2,-4], [3,-2,1,-5,2,-4]), ([-1,1], [1,-1])]
all_pass = True
for nums, exp in tests:
    res = rearrangeArray(nums)
    if res != exp:
        print(f"❌ FAILED for {nums}: expected {exp}, got {res}")
        all_pass = False
if all_pass: print("✅ All tests passed!")`
          },
          {
            title: 'Next Permutation',
            difficulty: 'Medium',
            description: `<h3>Problem</h3><p>A permutation of an array of integers is an arrangement of its members into a sequence or linear order.</p><p>The next permutation of an array of integers is the next lexicographically greater permutation of its integer. More formally, if all the permutations of the array are sorted in one container according to their lexicographical order, then the next permutation of that array is the permutation that follows it in the sorted container.</p><p>If such arrangement is not possible, the array must be rearranged as the lowest possible order (i.e., sorted in ascending order).</p><h3>Examples</h3><pre>Input: nums = [1,2,3]\nOutput: [1,3,2]</pre><pre>Input: nums = [3,2,1]\nOutput: [1,2,3]</pre><pre>Input: nums = [1,1,5]\nOutput: [1,5,1]</pre><h3>Constraints</h3><ul><li><code>1 &lt;= nums.length &lt;= 100</code></li><li>Must be done in-place!</li></ul>`,
            starterCode: `def nextPermutation(nums):
    """
    Modify nums in-place to the next lexicographically greater permutation.
    Return the modified array for testing purposes.
    """
    pass

# --- Test cases ---
print("Testing nextPermutation...")
tests = [([1,2,3], [1,3,2]), ([3,2,1], [1,2,3]), ([1,1,5], [1,5,1])]
all_pass = True
for nums, exp in tests:
    original = nums.copy()
    res = nextPermutation(nums)
    if nums != exp and res != exp: # Accept both in-place or returned array
        print(f"❌ FAILED for {original}: expected {exp}, got {nums}")
        all_pass = False
if all_pass: print("✅ All tests passed!")`
          },
          {
            title: 'Leaders in an Array',
            difficulty: 'Easy',
            description: `<h3>Problem</h3><p>Given an array, print all the elements which are leaders. A Leader is an element that is greater than all of the elements on its right side in the array.</p><p>The rightmost element is always a leader.</p><h3>Examples</h3><pre>Input: arr = [16, 17, 4, 3, 5, 2]\nOutput: [17, 5, 2]</pre><pre>Input: arr = [1, 2, 3, 4, 0]\nOutput: [4, 0]</pre><h3>Constraints</h3><ul><li><code>1 &lt;= arr.length &lt;= 10<sup>5</sup></code></li></ul>`,
            starterCode: `def getLeaders(arr):
    """
    Return all elements that are strictly greater than all elements to their right.
    """
    pass

# --- Test cases ---
print("Testing getLeaders...")
tests = [([16,17,4,3,5,2], [17,5,2]), ([1,2,3,4,0], [4,0])]
all_pass = True
for arr, exp in tests:
    res = getLeaders(arr)
    if res != exp:
        print(f"❌ FAILED for {arr}: expected {exp}, got {res}")
        all_pass = False
if all_pass: print("✅ All tests passed!")`
          },
          {
            title: 'Longest Consecutive Sequence in an Array',
            difficulty: 'Medium',
            description: `<h3>Problem</h3><p>Given an unsorted array of integers <code>nums</code>, return the length of the longest consecutive elements sequence.</p><p>You must write an algorithm that runs in <code>O(n)</code> time.</p><h3>Examples</h3><pre>Input: nums = [100, 4, 200, 1, 3, 2]\nOutput: 4\nExplanation: The longest consecutive elements sequence is [1, 2, 3, 4]. Therefore its length is 4.</pre><pre>Input: nums = [0,3,7,2,5,8,4,6,0,1]\nOutput: 9</pre><h3>Constraints</h3><ul><li><code>0 &lt;= nums.length &lt;= 10<sup>5</sup></code></li></ul>`,
            starterCode: `def longestConsecutive(nums):
    """
    Return the length of the longest consecutive sequence. Time complexity must be O(n).
    """
    pass

# --- Test cases ---
print("Testing longestConsecutive...")
tests = [([100,4,200,1,3,2], 4), ([0,3,7,2,5,8,4,6,0,1], 9), ([], 0)]
all_pass = True
for nums, exp in tests:
    res = longestConsecutive(nums)
    if res != exp:
        print(f"❌ FAILED for {nums}: expected {exp}, got {res}")
        all_pass = False
if all_pass: print("✅ All tests passed!")`
          },
          {
            title: 'Set Matrix Zeroes',
            difficulty: 'Medium',
            description: `<h3>Problem</h3><p>Given an <code>m x n</code> integer matrix <code>matrix</code>, if an element is <code>0</code>, set its entire row and column to <code>0</code>'s.</p><p>You must do it <b>in place</b>.</p><h3>Examples</h3><pre>Input: matrix = [[1,1,1],[1,0,1],[1,1,1]]\nOutput: [[1,0,1],[0,0,0],[1,0,1]]</pre><h3>Constraints</h3><ul><li><code>m == matrix.length</code></li><li><code>n == matrix[0].length</code></li></ul>`,
            starterCode: `def setZeroes(matrix):
    """
    Set corresponding queries to 0 in-place.
    """
    pass

# --- Test cases ---
print("Testing setZeroes...")
tests = [([[1,1,1],[1,0,1],[1,1,1]], [[1,0,1],[0,0,0],[1,0,1]])]
all_pass = True
for matrix, exp in tests:
    original = [row[:] for row in matrix]
    setZeroes(matrix)
    if matrix != exp:
        print(f"❌ FAILED for {original}: expected {exp}, got {matrix}")
        all_pass = False
if all_pass: print("✅ All tests passed!")`
          },
          {
            title: 'Rotate Image by 90 Degrees',
            difficulty: 'Medium',
            description: `<h3>Problem</h3><p>You are given an <code>n x n</code> 2D <code>matrix</code> representing an image, rotate the image by <b>90 degrees (clockwise)</b>.</p><p>You have to rotate the image <b>in-place</b>.</p><h3>Examples</h3><pre>Input: matrix = [[1,2,3],[4,5,6],[7,8,9]]\nOutput: [[7,4,1],[8,5,2],[9,6,3]]</pre><h3>Constraints</h3><ul><li><code>n == matrix.length == matrix[i].length</code></li><li><code>1 &lt;= n &lt;= 20</code></li></ul>`,
            starterCode: `def rotate(matrix):
    """
    Rotate the matrix 90 degrees clockwise in-place.
    """
    pass

# --- Test cases ---
print("Testing rotate...")
tests = [([[1,2,3],[4,5,6],[7,8,9]], [[7,4,1],[8,5,2],[9,6,3]])]
all_pass = True
for matrix, exp in tests:
    original = [row[:] for row in matrix]
    rotate(matrix)
    if matrix != exp:
        print(f"❌ FAILED for {original}: expected {exp}, got {matrix}")
        all_pass = False
if all_pass: print("✅ All tests passed!")`
          },
          {
            title: 'Spiral Traversal of Matrix',
            difficulty: 'Medium',
            description: `<h3>Problem</h3><p>Given an <code>m x n</code> <code>matrix</code>, return all elements of the matrix in spiral order.</p><h3>Examples</h3><pre>Input: matrix = [[1,2,3],[4,5,6],[7,8,9]]\nOutput: [1,2,3,6,9,8,7,4,5]</pre><h3>Constraints</h3><ul><li><code>m == matrix.length</code></li><li><code>n == matrix[i].length</code></li></ul>`,
            starterCode: `def spiralOrder(matrix):
    """
    Return the elements of the matrix in spiral order.
    """
    pass

# --- Test cases ---
print("Testing spiralOrder...")
tests = [([[1,2,3],[4,5,6],[7,8,9]], [1,2,3,6,9,8,7,4,5])]
all_pass = True
for matrix, exp in tests:
    res = spiralOrder(matrix)
    if res != exp:
        print(f"❌ FAILED: expected {exp}, got {res}")
        all_pass = False
if all_pass: print("✅ All tests passed!")`
          },
          {
            title: 'Count Subarrays with Given Sum',
            difficulty: 'Medium',
            description: `<h3>Problem</h3><p>Given an array of integers <code>nums</code> and an integer <code>k</code>, return the total number of subarrays whose sum equals to <code>k</code>.</p><p>A subarray is a contiguous non-empty sequence of elements within an array.</p><h3>Examples</h3><pre>Input: nums = [1,1,1], k = 2\nOutput: 2</pre><pre>Input: nums = [1,2,3], k = 3\nOutput: 2</pre><h3>Constraints</h3><ul><li><code>1 &lt;= nums.length &lt;= 2 * 10<sup>4</sup></code></li><li><code>-1000 &lt;= nums[i] &lt;= 1000</code></li></ul>`,
            starterCode: `def subarraySum(nums, k):
    """
    Return the total number of continuous subarrays whose sum equals to k.
    """
    pass

# --- Test cases ---
print("Testing subarraySum...")
tests = [([1,1,1], 2, 2), ([1,2,3], 3, 2)]
all_pass = True
for nums, k, exp in tests:
    res = subarraySum(nums, k)
    if res != exp:
        print(f"❌ FAILED for {nums}: expected {exp}, got {res}")
        all_pass = False
if all_pass: print("✅ All tests passed!")`
          },
        ],
      },
      {
        label: 'Hard',
        problems: [
          { title: 'Pascal\'s Triangle', difficulty: 'Medium' },
          { title: 'Majority Element II (> n/3 times)', difficulty: 'Medium' },
          { title: '3 Sum', difficulty: 'Medium' },
          { title: '4 Sum', difficulty: 'Hard' },
          { title: 'Largest Subarray with 0 Sum', difficulty: 'Medium' },
          { title: 'Count Subarrays with Given XOR K', difficulty: 'Hard' },
          { title: 'Merge Overlapping Subintervals', difficulty: 'Medium' },
          { title: 'Merge Two Sorted Arrays Without Extra Space', difficulty: 'Hard' },
          { title: 'Find the Repeating and Missing Number', difficulty: 'Hard' },
          { title: 'Count Inversions', difficulty: 'Hard' },
          { title: 'Reverse Pairs', difficulty: 'Hard' },
          { title: 'Maximum Product Subarray', difficulty: 'Medium' },
        ],
      },
    ],
  },

  // ═══════════════════ STEP 4 ═══════════════════
  {
    id: 'step4',
    step: 4,
    title: 'Binary Search',
    icon: '🔍',
    color: '#f59e0b',
    topics: [
      {
        label: 'BS on 1D Arrays',
        problems: [
          { title: 'Binary Search to find X in sorted array', difficulty: 'Easy' },
          { title: 'Implement Lower Bound', difficulty: 'Easy' },
          { title: 'Implement Upper Bound', difficulty: 'Easy' },
          { title: 'Search Insert Position', difficulty: 'Easy' },
          { title: 'Floor and Ceil in Sorted Array', difficulty: 'Easy' },
          { title: 'First and Last Occurrence in Sorted Array', difficulty: 'Medium' },
          { title: 'Count Occurrences in Sorted Array', difficulty: 'Easy' },
          { title: 'Search in Rotated Sorted Array I', difficulty: 'Medium' },
          { title: 'Search in Rotated Sorted Array II', difficulty: 'Medium' },
          { title: 'Find Minimum in Rotated Sorted Array', difficulty: 'Medium' },
          { title: 'Find out how many times array has been rotated', difficulty: 'Easy' },
          { title: 'Single Element in a Sorted Array', difficulty: 'Medium' },
          { title: 'Find Peak Element', difficulty: 'Medium' },
        ],
      },
      {
        label: 'BS on Answers',
        problems: [
          { title: 'Find Square Root of a Number', difficulty: 'Easy' },
          { title: 'Find the Nth Root of a Number', difficulty: 'Medium' },
          { title: 'Koko Eating Bananas', difficulty: 'Medium' },
          { title: 'Minimum Days to Make M Bouquets', difficulty: 'Medium' },
          { title: 'Find the Smallest Divisor Given a Threshold', difficulty: 'Medium' },
          { title: 'Capacity to Ship Packages within D Days', difficulty: 'Medium' },
          { title: 'Kth Missing Positive Number', difficulty: 'Easy' },
          { title: 'Aggressive Cows', difficulty: 'Hard' },
          { title: 'Book Allocation Problem', difficulty: 'Hard' },
          { title: 'Split Array — Largest Sum', difficulty: 'Hard' },
          { title: 'Painter\'s Partition Problem', difficulty: 'Hard' },
          { title: 'Minimize Max Distance to Gas Station', difficulty: 'Hard' },
          { title: 'Median of Two Sorted Arrays', difficulty: 'Hard' },
          { title: 'Kth Element of Two Sorted Arrays', difficulty: 'Hard' },
        ],
      },
      {
        label: 'BS on 2D Arrays',
        problems: [
          { title: 'Find the Row with Maximum Number of 1s', difficulty: 'Easy' },
          { title: 'Search in a 2D Matrix', difficulty: 'Medium' },
          { title: 'Search in a 2D Matrix II', difficulty: 'Medium' },
          { title: 'Find Peak Element in 2D Matrix', difficulty: 'Hard' },
          { title: 'Matrix Median', difficulty: 'Hard' },
        ],
      },
    ],
  },

  // ═══════════════════ STEP 5 ═══════════════════
  {
    id: 'step5',
    step: 5,
    title: 'Strings [Basic and Medium]',
    icon: '🔤',
    color: '#ec4899',
    topics: [
      {
        label: 'Basic String Problems',
        problems: [
          { title: 'Remove Outermost Parentheses', difficulty: 'Easy' },
          { title: 'Reverse Words in a String', difficulty: 'Medium' },
          { title: 'Largest Odd Number in String', difficulty: 'Easy' },
          { title: 'Longest Common Prefix', difficulty: 'Easy' },
          { title: 'Isomorphic Strings', difficulty: 'Easy' },
          { title: 'Rotate String', difficulty: 'Easy' },
          { title: 'Check if Two Strings are Anagrams', difficulty: 'Easy' },
        ],
      },
      {
        label: 'Medium String Problems',
        problems: [
          { title: 'Sort Characters by Frequency', difficulty: 'Medium' },
          { title: 'Maximum Nesting Depth of Parentheses', difficulty: 'Easy' },
          { title: 'Roman Number to Integer', difficulty: 'Easy' },
          { title: 'String to Integer (atoi)', difficulty: 'Medium' },
          { title: 'Count Number of Substrings', difficulty: 'Medium' },
          { title: 'Longest Palindromic Substring', difficulty: 'Medium' },
          { title: 'Sum of Beauty of All Substrings', difficulty: 'Medium' },
          { title: 'Reverse Every Word in a String', difficulty: 'Medium' },
        ],
      },
    ],
  },

  // ═══════════════════ STEP 6 ═══════════════════
  {
    id: 'step6',
    step: 6,
    title: 'Learn LinkedList',
    icon: '🔗',
    color: '#14b8a6',
    topics: [
      {
        label: '1D LinkedList',
        problems: [
          { title: 'Introduction to Linked List', difficulty: 'Easy' },
          { title: 'Inserting a node in Linked List', difficulty: 'Easy' },
          { title: 'Deleting a node in Linked List', difficulty: 'Easy' },
          { title: 'Find the length of the Linked List', difficulty: 'Easy' },
          { title: 'Search an element in a Linked List', difficulty: 'Easy' },
        ],
      },
      {
        label: 'Doubly LinkedList',
        problems: [
          { title: 'Introduction to Doubly Linked List', difficulty: 'Easy' },
          { title: 'Insert a node in Doubly Linked List', difficulty: 'Easy' },
          { title: 'Delete a node in Doubly Linked List', difficulty: 'Easy' },
          { title: 'Reverse a Doubly Linked List', difficulty: 'Easy' },
        ],
      },
      {
        label: 'Medium Problems of LL',
        problems: [
          { title: 'Middle of a Linked List', difficulty: 'Easy' },
          { title: 'Reverse a Linked List (Iterative)', difficulty: 'Easy' },
          { title: 'Reverse a Linked List (Recursive)', difficulty: 'Easy' },
          { title: 'Detect a Loop in Linked List', difficulty: 'Easy' },
          { title: 'Find the Starting Point of the Loop', difficulty: 'Medium' },
          { title: 'Length of Loop in Linked List', difficulty: 'Easy' },
          { title: 'Check if Linked List is Palindrome', difficulty: 'Medium' },
          { title: 'Segregate Odd and Even Nodes', difficulty: 'Medium' },
          { title: 'Remove Nth Node from the Back', difficulty: 'Medium' },
          { title: 'Delete the Middle Node', difficulty: 'Medium' },
          { title: 'Sort a Linked List', difficulty: 'Medium' },
          { title: 'Sort a Linked List of 0s 1s and 2s', difficulty: 'Medium' },
          { title: 'Find the intersection point of Y LinkedList', difficulty: 'Medium' },
          { title: 'Add 1 to a Linked List Number', difficulty: 'Medium' },
          { title: 'Add 2 Numbers in Linked List', difficulty: 'Medium' },
        ],
      },
      {
        label: 'Hard Problems of LL',
        problems: [
          { title: 'Reverse Linked List in groups of Size K', difficulty: 'Hard' },
          { title: 'Rotate a Linked List', difficulty: 'Medium' },
          { title: 'Flattening a Linked List', difficulty: 'Hard' },
          { title: 'Clone a Linked List with Random Pointer', difficulty: 'Hard' },
        ],
      },
    ],
  },

  // ═══════════════════ STEP 7 ═══════════════════
  {
    id: 'step7',
    step: 7,
    title: 'Recursion [PatternWise]',
    icon: '🔄',
    color: '#a855f7',
    topics: [
      {
        label: 'Get a Strong Hold',
        problems: [
          { title: 'Recursive Implementation of atoi()', difficulty: 'Medium' },
          { title: 'Pow(x, n)', difficulty: 'Medium' },
          { title: 'Count Good Numbers', difficulty: 'Medium' },
          { title: 'Sort a Stack using Recursion', difficulty: 'Medium' },
          { title: 'Reverse a Stack using Recursion', difficulty: 'Medium' },
          { title: 'Generate all binary strings', difficulty: 'Medium' },
          { title: 'Generate Parentheses', difficulty: 'Medium' },
          { title: 'Print all subsequences / Power Set', difficulty: 'Medium' },
          { title: 'Count subsequences with sum K', difficulty: 'Medium' },
          { title: 'Check if subsequence exists with sum K', difficulty: 'Medium' },
          { title: 'Combination Sum', difficulty: 'Medium' },
          { title: 'Combination Sum II', difficulty: 'Medium' },
          { title: 'Subset Sum I', difficulty: 'Medium' },
          { title: 'Subset Sum II (unique subsets)', difficulty: 'Medium' },
          { title: 'Combination Sum III', difficulty: 'Medium' },
          { title: 'Letter Combinations of a Phone Number', difficulty: 'Medium' },
        ],
      },
      {
        label: 'Trying out all Combos / Hard',
        problems: [
          { title: 'Palindrome Partitioning', difficulty: 'Hard' },
          { title: 'Word Search', difficulty: 'Medium' },
          { title: 'N Queen Problem', difficulty: 'Hard' },
          { title: 'Rat in a Maze', difficulty: 'Hard' },
          { title: 'Word Break', difficulty: 'Medium' },
          { title: 'M Coloring Problem', difficulty: 'Hard' },
          { title: 'Sudoku Solver', difficulty: 'Hard' },
          { title: 'Expression Add Operators', difficulty: 'Hard' },
        ],
      },
    ],
  },

  // ═══════════════════ STEP 8 ═══════════════════
  {
    id: 'step8',
    step: 8,
    title: 'Bit Manipulation',
    icon: '⚡',
    color: '#eab308',
    topics: [
      {
        label: 'Learn Bit Manipulation',
        problems: [
          { title: 'Introduction to Bit Manipulation', difficulty: 'Easy' },
          { title: 'Check if ith bit is set or not', difficulty: 'Easy' },
          { title: 'Check if a number is odd or not', difficulty: 'Easy' },
          { title: 'Check if a number is power of 2', difficulty: 'Easy' },
          { title: 'Count the number of set bits', difficulty: 'Easy' },
          { title: 'Set / Unset the rightmost unset bit', difficulty: 'Easy' },
          { title: 'Swap two numbers', difficulty: 'Easy' },
          { title: 'Divide two integers without using operators', difficulty: 'Medium' },
        ],
      },
      {
        label: 'Interview Problems',
        problems: [
          { title: 'Count number of bits to flip to convert A to B', difficulty: 'Easy' },
          { title: 'Find the number that appears odd times', difficulty: 'Easy' },
          { title: 'Power Set using Bit Manipulation', difficulty: 'Medium' },
          { title: 'Find two numbers appearing odd times', difficulty: 'Medium' },
          { title: 'XOR of numbers in a given range', difficulty: 'Medium' },
        ],
      },
      {
        label: 'Advanced Maths',
        problems: [
          { title: 'Print Prime Factors of a Number', difficulty: 'Easy' },
          { title: 'All Divisors of a Number', difficulty: 'Easy' },
          { title: 'Sieve of Eratosthenes', difficulty: 'Medium' },
          { title: 'Find Prime Factorisation using Sieve', difficulty: 'Medium' },
          { title: 'Power(n, x)', difficulty: 'Easy' },
        ],
      },
    ],
  },

  // ═══════════════════ STEP 9 ═══════════════════
  {
    id: 'step9',
    step: 9,
    title: 'Stack and Queues',
    icon: '📚',
    color: '#f97316',
    topics: [
      {
        label: 'Learning',
        problems: [
          { title: 'Implement Stack using Arrays', difficulty: 'Easy' },
          { title: 'Implement Queue using Arrays', difficulty: 'Easy' },
          { title: 'Implement Stack using Queue', difficulty: 'Medium' },
          { title: 'Implement Queue using Stack', difficulty: 'Medium' },
          { title: 'Implement Stack using Linked List', difficulty: 'Easy' },
          { title: 'Implement Queue using Linked List', difficulty: 'Easy' },
          { title: 'Check for Balanced Parentheses', difficulty: 'Easy' },
          { title: 'Implement Min Stack', difficulty: 'Medium' },
        ],
      },
      {
        label: 'Prefix, Infix, Postfix Conversion',
        problems: [
          { title: 'Infix to Postfix Conversion', difficulty: 'Medium' },
          { title: 'Prefix to Infix Conversion', difficulty: 'Medium' },
          { title: 'Prefix to Postfix Conversion', difficulty: 'Medium' },
          { title: 'Postfix to Prefix Conversion', difficulty: 'Medium' },
          { title: 'Postfix to Infix Conversion', difficulty: 'Medium' },
          { title: 'Infix to Prefix Conversion', difficulty: 'Medium' },
        ],
      },
      {
        label: 'Monotonic Stack / Queue',
        problems: [
          { title: 'Next Greater Element', difficulty: 'Medium' },
          { title: 'Next Greater Element II (circular)', difficulty: 'Medium' },
          { title: 'Next Smaller Element', difficulty: 'Medium' },
          { title: 'Number of NGEs to the right', difficulty: 'Medium' },
          { title: 'Trapping Rain Water', difficulty: 'Hard' },
          { title: 'Sum of Subarray Minimums', difficulty: 'Medium' },
          { title: 'Asteroid Collision', difficulty: 'Medium' },
          { title: 'Sum of Subarray Ranges', difficulty: 'Medium' },
          { title: 'Remove K Digits', difficulty: 'Medium' },
          { title: 'Largest Rectangle in Histogram', difficulty: 'Hard' },
          { title: 'Maximal Rectangle', difficulty: 'Hard' },
        ],
      },
      {
        label: 'Implementation Problems',
        problems: [
          { title: 'Sliding Window Maximum', difficulty: 'Hard' },
          { title: 'Stock Span Problem', difficulty: 'Medium' },
          { title: 'The Celebrity Problem', difficulty: 'Medium' },
          { title: 'LRU Cache', difficulty: 'Hard' },
          { title: 'LFU Cache', difficulty: 'Hard' },
        ],
      },
    ],
  },

  // ═══════════════════ STEP 10 ═══════════════════
  {
    id: 'step10',
    step: 10,
    title: 'Sliding Window & Two Pointer',
    icon: '🪟',
    color: '#0ea5e9',
    topics: [
      {
        label: 'Medium Problems',
        problems: [
          { title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium' },
          { title: 'Max Consecutive Ones III', difficulty: 'Medium' },
          { title: 'Fruit Into Baskets', difficulty: 'Medium' },
          { title: 'Longest Repeating Character Replacement', difficulty: 'Medium' },
          { title: 'Binary Subarrays With Sum', difficulty: 'Medium' },
          { title: 'Count Nice Subarrays', difficulty: 'Medium' },
          { title: 'Number of Substrings Containing All Three Characters', difficulty: 'Medium' },
          { title: 'Maximum Points You Can Obtain from Cards', difficulty: 'Medium' },
        ],
      },
      {
        label: 'Hard Problems',
        problems: [
          { title: 'Longest Substring with At Most K Distinct Characters', difficulty: 'Hard' },
          { title: 'Subarrays with K Different Integers', difficulty: 'Hard' },
          { title: 'Minimum Window Substring', difficulty: 'Hard' },
          { title: 'Minimum Window Subsequence', difficulty: 'Hard' },
        ],
      },
    ],
  },

  // ═══════════════════ STEP 11 ═══════════════════
  {
    id: 'step11',
    step: 11,
    title: 'Heaps',
    icon: '🏔️',
    color: '#d946ef',
    topics: [
      {
        label: 'Learning',
        problems: [
          { title: 'Introduction to Priority Queues using Binary Heaps', difficulty: 'Easy' },
          { title: 'Min Heap and Max Heap Implementation', difficulty: 'Medium' },
          { title: 'Check if an array represents a Min-Heap', difficulty: 'Easy' },
          { title: 'Convert Min Heap to Max Heap', difficulty: 'Easy' },
        ],
      },
      {
        label: 'Medium Problems',
        problems: [
          { title: 'Kth Largest Element in an Array', difficulty: 'Medium' },
          { title: 'Kth Smallest Element', difficulty: 'Medium' },
          { title: 'Sort a K Sorted Array (Nearly Sorted)', difficulty: 'Medium' },
          { title: 'Merge M Sorted Lists', difficulty: 'Hard' },
          { title: 'Replace each element by its rank', difficulty: 'Easy' },
          { title: 'Task Scheduler', difficulty: 'Medium' },
          { title: 'Hands of Straights', difficulty: 'Medium' },
        ],
      },
      {
        label: 'Hard Problems',
        problems: [
          { title: 'Design Twitter', difficulty: 'Hard' },
          { title: 'Connect N Ropes with Minimum Cost', difficulty: 'Medium' },
          { title: 'Kth Largest Element in a Stream', difficulty: 'Easy' },
          { title: 'Maximum Sum Combination', difficulty: 'Hard' },
          { title: 'Find Median from Data Stream', difficulty: 'Hard' },
          { title: 'K Most Frequent Elements', difficulty: 'Medium' },
        ],
      },
    ],
  },

  // ═══════════════════ STEP 12 ═══════════════════
  {
    id: 'step12',
    step: 12,
    title: 'Greedy Algorithms',
    icon: '💰',
    color: '#22c55e',
    topics: [
      {
        label: 'Easy Problems',
        problems: [
          { title: 'Assign Cookies', difficulty: 'Easy' },
          { title: 'Fractional Knapsack Problem', difficulty: 'Easy' },
          { title: 'Greedy algorithm to find minimum number of coins', difficulty: 'Easy' },
          { title: 'Lemonade Change', difficulty: 'Easy' },
          { title: 'Valid Parenthesis String', difficulty: 'Medium' },
        ],
      },
      {
        label: 'Medium / Hard Problems',
        problems: [
          { title: 'N meetings in one room', difficulty: 'Easy' },
          { title: 'Jump Game', difficulty: 'Medium' },
          { title: 'Jump Game II', difficulty: 'Medium' },
          { title: 'Minimum number of platforms required', difficulty: 'Medium' },
          { title: 'Job Sequencing Problem', difficulty: 'Medium' },
          { title: 'Candy', difficulty: 'Hard' },
          { title: 'Program for Shortest Job First', difficulty: 'Easy' },
          { title: 'Program for Least Recently Used Page Replacement', difficulty: 'Medium' },
          { title: 'Insert Interval', difficulty: 'Medium' },
          { title: 'Merge Intervals', difficulty: 'Medium' },
          { title: 'Non-overlapping Intervals', difficulty: 'Medium' },
        ],
      },
    ],
  },

  // ═══════════════════ STEP 13 ═══════════════════
  {
    id: 'step13',
    step: 13,
    title: 'Binary Trees',
    icon: '🌳',
    color: '#16a34a',
    topics: [
      {
        label: 'Traversals',
        problems: [
          { title: 'Introduction to Trees', difficulty: 'Easy' },
          { title: 'Binary Tree Representation in Code', difficulty: 'Easy' },
          { title: 'Preorder Traversal', difficulty: 'Easy' },
          { title: 'Inorder Traversal', difficulty: 'Easy' },
          { title: 'Postorder Traversal', difficulty: 'Easy' },
          { title: 'Level Order Traversal', difficulty: 'Medium' },
          { title: 'Iterative Preorder Traversal', difficulty: 'Medium' },
          { title: 'Iterative Inorder Traversal', difficulty: 'Medium' },
          { title: 'Post-order using 2 stacks', difficulty: 'Medium' },
          { title: 'Post-order using 1 stack', difficulty: 'Hard' },
          { title: 'All traversals in one (Pre, In, Post)', difficulty: 'Medium' },
        ],
      },
      {
        label: 'Medium Problems',
        problems: [
          { title: 'Height of a Binary Tree', difficulty: 'Easy' },
          { title: 'Check if Binary Tree is Balanced', difficulty: 'Easy' },
          { title: 'Diameter of Binary Tree', difficulty: 'Easy' },
          { title: 'Maximum Path Sum', difficulty: 'Hard' },
          { title: 'Check if two Trees are Identical', difficulty: 'Easy' },
          { title: 'Zig-Zag Traversal of Binary Tree', difficulty: 'Medium' },
          { title: 'Boundary Traversal of Binary Tree', difficulty: 'Medium' },
          { title: 'Vertical Order Traversal', difficulty: 'Hard' },
          { title: 'Top View of Binary Tree', difficulty: 'Medium' },
          { title: 'Bottom View of Binary Tree', difficulty: 'Medium' },
          { title: 'Right / Left View of Binary Tree', difficulty: 'Medium' },
          { title: 'Symmetric Binary Tree', difficulty: 'Easy' },
        ],
      },
      {
        label: 'Hard Problems',
        problems: [
          { title: 'Root to Node Path in Binary Tree', difficulty: 'Medium' },
          { title: 'Lowest Common Ancestor', difficulty: 'Medium' },
          { title: 'Maximum Width of Binary Tree', difficulty: 'Medium' },
          { title: 'Check for Children Sum Property', difficulty: 'Medium' },
          { title: 'Print all Nodes at distance K', difficulty: 'Medium' },
          { title: 'Minimum time to burn the Binary Tree', difficulty: 'Hard' },
          { title: 'Count Total Nodes in a Complete Binary Tree', difficulty: 'Medium' },
          { title: 'Requirements needed to construct a unique BT', difficulty: 'Medium' },
          { title: 'Construct Binary Tree from Inorder and Preorder', difficulty: 'Medium' },
          { title: 'Construct Binary Tree from Inorder and Postorder', difficulty: 'Medium' },
          { title: 'Serialize and Deserialize Binary Tree', difficulty: 'Hard' },
          { title: 'Morris Preorder Traversal', difficulty: 'Medium' },
          { title: 'Morris Inorder Traversal', difficulty: 'Medium' },
          { title: 'Flatten Binary Tree to Linked List', difficulty: 'Medium' },
        ],
      },
    ],
  },

  // ═══════════════════ STEP 14 ═══════════════════
  {
    id: 'step14',
    step: 14,
    title: 'Binary Search Trees',
    icon: '🌲',
    color: '#65a30d',
    topics: [
      {
        label: 'Concept & Problems',
        problems: [
          { title: 'Introduction to BST', difficulty: 'Easy' },
          { title: 'Search in a BST', difficulty: 'Easy' },
          { title: 'Find Min / Max in BST', difficulty: 'Easy' },
          { title: 'Ceil in a BST', difficulty: 'Medium' },
          { title: 'Floor in a BST', difficulty: 'Medium' },
          { title: 'Insert a Node in BST', difficulty: 'Medium' },
          { title: 'Delete a Node in BST', difficulty: 'Medium' },
          { title: 'Find Kth Smallest / Largest in BST', difficulty: 'Medium' },
          { title: 'Check if a tree is a BST', difficulty: 'Medium' },
          { title: 'LCA in BST', difficulty: 'Easy' },
          { title: 'Construct BST from Preorder Traversal', difficulty: 'Medium' },
          { title: 'Inorder Successor / Predecessor in BST', difficulty: 'Medium' },
          { title: 'Merge Two BSTs', difficulty: 'Hard' },
          { title: 'Two Sum in BST', difficulty: 'Easy' },
          { title: 'Recover BST (Two nodes swapped)', difficulty: 'Hard' },
          { title: 'Largest BST in Binary Tree', difficulty: 'Hard' },
        ],
      },
    ],
  },

  // ═══════════════════ STEP 15 ═══════════════════
  {
    id: 'step15',
    step: 15,
    title: 'Graphs',
    icon: '🕸️',
    color: '#ef4444',
    topics: [
      {
        label: 'Learning',
        problems: [
          { title: 'Graph Representation (Adjacency List/Matrix)', difficulty: 'Easy' },
          { title: 'Connected Components', difficulty: 'Easy' },
          { title: 'BFS', difficulty: 'Easy' },
          { title: 'DFS', difficulty: 'Easy' },
        ],
      },
      {
        label: 'Problems on BFS/DFS',
        problems: [
          { title: 'Number of Provinces', difficulty: 'Medium' },
          { title: 'Number of Islands', difficulty: 'Medium' },
          { title: 'Flood Fill', difficulty: 'Easy' },
          { title: 'Rotten Oranges', difficulty: 'Medium' },
          { title: 'Detect Cycle in Undirected Graph (BFS)', difficulty: 'Medium' },
          { title: 'Detect Cycle in Undirected Graph (DFS)', difficulty: 'Medium' },
          { title: '0/1 Matrix (Distance of nearest cell having 1)', difficulty: 'Medium' },
          { title: 'Surrounded Regions', difficulty: 'Medium' },
          { title: 'Number of Enclaves', difficulty: 'Medium' },
          { title: 'Word Ladder I', difficulty: 'Hard' },
          { title: 'Word Ladder II', difficulty: 'Hard' },
          { title: 'Number of Distinct Islands', difficulty: 'Medium' },
          { title: 'Bipartite Graph (BFS)', difficulty: 'Medium' },
          { title: 'Bipartite Graph (DFS)', difficulty: 'Medium' },
          { title: 'Detect Cycle in Directed Graph (DFS)', difficulty: 'Medium' },
        ],
      },
      {
        label: 'Topo Sort and Problems',
        problems: [
          { title: 'Topological Sort (DFS)', difficulty: 'Medium' },
          { title: 'Kahn\'s Algorithm (BFS)', difficulty: 'Medium' },
          { title: 'Cycle Detection in Directed Graph (BFS)', difficulty: 'Medium' },
          { title: 'Course Schedule I', difficulty: 'Medium' },
          { title: 'Course Schedule II', difficulty: 'Medium' },
          { title: 'Find Eventual Safe States', difficulty: 'Medium' },
          { title: 'Alien Dictionary', difficulty: 'Hard' },
        ],
      },
      {
        label: 'Shortest Path Algorithms',
        problems: [
          { title: 'Shortest Path in Undirected Graph with Unit Weights', difficulty: 'Medium' },
          { title: 'Shortest Path in DAG', difficulty: 'Medium' },
          { title: 'Dijkstra\'s Algorithm', difficulty: 'Medium' },
          { title: 'Print Shortest Path (Dijkstra)', difficulty: 'Medium' },
          { title: 'Shortest Distance in a Binary Maze', difficulty: 'Medium' },
          { title: 'Path with Minimum Effort', difficulty: 'Medium' },
          { title: 'Cheapest Flights Within K Stops', difficulty: 'Medium' },
          { title: 'Network Delay Time', difficulty: 'Medium' },
          { title: 'Number of Ways to Arrive at Destination', difficulty: 'Medium' },
          { title: 'Bellman-Ford Algorithm', difficulty: 'Medium' },
          { title: 'Floyd Warshall Algorithm', difficulty: 'Medium' },
          { title: 'City with the Smallest Number of Neighbours at a Threshold', difficulty: 'Medium' },
        ],
      },
      {
        label: 'Minimum Spanning Tree / Disjoint Set',
        problems: [
          { title: 'Prim\'s Algorithm — MST', difficulty: 'Medium' },
          { title: 'Kruskal\'s Algorithm — MST', difficulty: 'Medium' },
          { title: 'Disjoint Set (Union by Rank & Path Compression)', difficulty: 'Medium' },
          { title: 'Number of Operations to Make Network Connected', difficulty: 'Medium' },
          { title: 'Most Stones Removed with Same Row or Column', difficulty: 'Medium' },
          { title: 'Accounts Merge', difficulty: 'Medium' },
          { title: 'Number of Islands II (Online Queries)', difficulty: 'Hard' },
          { title: 'Making a Large Island', difficulty: 'Hard' },
          { title: 'Swim in Rising Water', difficulty: 'Hard' },
        ],
      },
      {
        label: 'Other Algorithms',
        problems: [
          { title: 'Bridges in a Graph (Tarjan\'s Algorithm)', difficulty: 'Hard' },
          { title: 'Articulation Points', difficulty: 'Hard' },
          { title: 'Strongly Connected Components (Kosaraju)', difficulty: 'Hard' },
        ],
      },
    ],
  },

  // ═══════════════════ STEP 16 ═══════════════════
  {
    id: 'step16',
    step: 16,
    title: 'Dynamic Programming',
    icon: '🧩',
    color: '#6366f1',
    topics: [
      {
        label: 'Introduction to DP',
        problems: [
          { title: 'Introduction to DP', difficulty: 'Easy' },
          { title: 'Climbing Stairs', difficulty: 'Easy' },
          { title: 'Frog Jump', difficulty: 'Easy' },
          { title: 'Frog Jump with K Distances', difficulty: 'Medium' },
          { title: 'Maximum Sum of Non-adjacent Elements (House Robber)', difficulty: 'Medium' },
          { title: 'House Robber II', difficulty: 'Medium' },
          { title: 'Ninja\'s Training', difficulty: 'Medium' },
        ],
      },
      {
        label: 'DP on Grids',
        problems: [
          { title: 'Grid Unique Paths', difficulty: 'Medium' },
          { title: 'Grid Unique Paths II', difficulty: 'Medium' },
          { title: 'Minimum Path Sum in Grid', difficulty: 'Medium' },
          { title: 'Minimum / Maximum Falling Path Sum', difficulty: 'Medium' },
          { title: 'Triangle — Minimum Path Sum', difficulty: 'Medium' },
          { title: 'Cherry Pickup II', difficulty: 'Hard' },
        ],
      },
      {
        label: 'DP on Subsequences',
        problems: [
          { title: 'Subset Sum Equal to Target', difficulty: 'Medium' },
          { title: 'Partition Equal Subset Sum', difficulty: 'Medium' },
          { title: 'Partition into Two Subsets with Min Absolute Difference', difficulty: 'Hard' },
          { title: 'Count Subsets with Sum K', difficulty: 'Medium' },
          { title: 'Count Partitions with Given Difference', difficulty: 'Medium' },
          { title: '0/1 Knapsack', difficulty: 'Medium' },
          { title: 'Coin Change', difficulty: 'Medium' },
          { title: 'Coin Change II', difficulty: 'Medium' },
          { title: 'Target Sum', difficulty: 'Medium' },
          { title: 'Unbounded Knapsack', difficulty: 'Medium' },
          { title: 'Rod Cutting Problem', difficulty: 'Medium' },
        ],
      },
      {
        label: 'DP on Strings',
        problems: [
          { title: 'Longest Common Subsequence', difficulty: 'Medium' },
          { title: 'Print Longest Common Subsequence', difficulty: 'Medium' },
          { title: 'Longest Common Substring', difficulty: 'Medium' },
          { title: 'Shortest Common Supersequence', difficulty: 'Hard' },
          { title: 'Minimum Insertions to Make String Palindrome', difficulty: 'Hard' },
          { title: 'Minimum Insertions / Deletions to convert String A to B', difficulty: 'Medium' },
          { title: 'Distinct Subsequences', difficulty: 'Hard' },
          { title: 'Edit Distance', difficulty: 'Hard' },
          { title: 'Wildcard Matching', difficulty: 'Hard' },
        ],
      },
      {
        label: 'DP on Stocks',
        problems: [
          { title: 'Best Time to Buy and Sell Stock', difficulty: 'Easy' },
          { title: 'Best Time to Buy and Sell Stock II', difficulty: 'Medium' },
          { title: 'Best Time to Buy and Sell Stock III', difficulty: 'Hard' },
          { title: 'Best Time to Buy and Sell Stock IV', difficulty: 'Hard' },
          { title: 'Best Time to Buy and Sell Stock with Cooldown', difficulty: 'Medium' },
          { title: 'Best Time to Buy and Sell Stock with Transaction Fee', difficulty: 'Medium' },
        ],
      },
      {
        label: 'DP on LIS',
        problems: [
          { title: 'Longest Increasing Subsequence', difficulty: 'Medium' },
          { title: 'Print Longest Increasing Subsequence', difficulty: 'Medium' },
          { title: 'Longest Increasing Subsequence (Binary Search)', difficulty: 'Medium' },
          { title: 'Largest Divisible Subset', difficulty: 'Medium' },
          { title: 'Longest String Chain', difficulty: 'Medium' },
          { title: 'Longest Bitonic Subsequence', difficulty: 'Medium' },
          { title: 'Number of Longest Increasing Subsequences', difficulty: 'Hard' },
        ],
      },
      {
        label: 'MCM DP / Partition DP',
        problems: [
          { title: 'Matrix Chain Multiplication', difficulty: 'Hard' },
          { title: 'Minimum Cost to Cut a Stick', difficulty: 'Hard' },
          { title: 'Burst Balloons', difficulty: 'Hard' },
          { title: 'Evaluate Boolean Expression to True', difficulty: 'Hard' },
          { title: 'Palindrome Partitioning II', difficulty: 'Hard' },
          { title: 'Partition Array for Maximum Sum', difficulty: 'Medium' },
        ],
      },
      {
        label: 'DP on Rectangles',
        problems: [
          { title: 'Maximal Rectangle with all 1s', difficulty: 'Hard' },
          { title: 'Count Square Submatrices with All Ones', difficulty: 'Medium' },
        ],
      },
    ],
  },

  // ═══════════════════ STEP 17 ═══════════════════
  {
    id: 'step17',
    step: 17,
    title: 'Tries',
    icon: '🌐',
    color: '#0891b2',
    topics: [
      {
        label: 'Theory',
        problems: [
          { title: 'Implement Trie I (Prefix Tree)', difficulty: 'Medium' },
          { title: 'Implement Trie II (with count)', difficulty: 'Medium' },
        ],
      },
      {
        label: 'Problems',
        problems: [
          { title: 'Longest String with All Prefixes (Complete String)', difficulty: 'Medium' },
          { title: 'Number of Distinct Substrings in a String', difficulty: 'Hard' },
          { title: 'Power Set using Bit Manipulation (Trie approach)', difficulty: 'Medium' },
          { title: 'Maximum XOR of Two Numbers in an Array', difficulty: 'Medium' },
          { title: 'Maximum XOR with an Element from Array', difficulty: 'Hard' },
        ],
      },
    ],
  },
]

// Total problems count
export function getTotalProblems() {
  let count = 0
  STEPS.forEach(step => step.topics.forEach(t => { count += t.problems.length }))
  return count
}
