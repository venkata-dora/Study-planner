/* ─────────────────────────────────────────────────────────────────
   ADVANCED PYTHON ROADMAP — Complete Practice Data
   Based on advanced_python_roadmap.md
   ───────────────────────────────────────────────────────────────── */

export const PY_STORAGE_KEY = 'dp_python_progress_v1'
export const PY_SOLUTIONS_KEY = 'dp_python_solutions_v1'
export const PY_DAILY_KEY = 'dp_python_daily_v1'

export function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PY_STORAGE_KEY)) || {} }
  catch { return {} }
}

function localDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function saveProgress(p, changedProbId, newStatus) {
  try {
    localStorage.setItem(PY_STORAGE_KEY, JSON.stringify(p))
    if (changedProbId && newStatus === 2) {
      const today = localDateStr()
      const daily = loadDailyHistory()
      if (!daily[today]) daily[today] = []
      if (!daily[today].includes(changedProbId)) {
        daily[today].push(changedProbId)
      }
      localStorage.setItem(PY_DAILY_KEY, JSON.stringify(daily))
    }
  } catch {}
}

export function loadDailyHistory() {
  try {
    const daily = JSON.parse(localStorage.getItem(PY_DAILY_KEY)) || {}
    return daily
  }
  catch { return {} }
}

export function getDailyStats(date) {
  const daily = loadDailyHistory()
  const solved = daily[date] || []
  const titles = solved.map(pid => {
    const m = pid.match(/^s(\d+)_t(\d+)_p(\d+)$/)
    if (!m) return pid
    const [, si, ti, pi] = m.map(Number)
    const prob = PHASES[si]?.topics[ti]?.problems[pi]
    return prob ? prob.title : pid
  })
  return { count: solved.length, problems: titles, ids: solved }
}

export function loadSolutions() {
  try { return JSON.parse(localStorage.getItem(PY_SOLUTIONS_KEY)) || {} }
  catch { return {} }
}

export function saveSolution(problemId, code) {
  try {
    const all = loadSolutions()
    all[problemId] = code
    localStorage.setItem(PY_SOLUTIONS_KEY, JSON.stringify(all))
  } catch {}
}

export function problemId(phaseIdx, topicIdx, probIdx) {
  return `s${phaseIdx}_t${topicIdx}_p${probIdx}`
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
  Easy:   { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
  Medium: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  Hard:   { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
}

export function getTotalProblems() {
  let count = 0
  PHASES.forEach(phase => phase.topics.forEach(t => { count += t.problems.length }))
  return count
}

/* ─────────────────────────────────────────────────────────────────
   PHASES — 12 Phases from the Advanced Python Roadmap
   Each phase has topics, each topic has practice problems
   ───────────────────────────────────────────────────────────────── */

export const PHASES = [
  // ── Phase 1: OOP Mastery ──
  {
    id: 'oop',
    phase: 1,
    title: 'OOP Mastery',
    icon: '🏛️',
    color: '#7c3aed',
    topics: [
      {
        label: '1.1 Classes — Beyond the Basics',
        problems: [
          {
            title: '__init__ vs __new__',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Implement a class <code>Singleton</code> that uses <code>__new__</code> to ensure only one instance is ever created. Any subsequent calls to <code>Singleton()</code> should return the same object.</p>
<h3>Examples</h3>
<pre>a = Singleton()
b = Singleton()
assert a is b  # True
print(id(a) == id(b))  # True</pre>
<h3>Key Concept</h3>
<p><code>__new__</code> controls object creation (before <code>__init__</code>). <code>__init__</code> only initializes an already-created object.</p>`,
            starterCode: `class Singleton:
    """Implement singleton using __new__."""
    _instance = None

    def __new__(cls):
        # TODO: return existing instance if already created
        pass

    def __init__(self):
        self.value = 42

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    import sys
    try:
        a = Singleton()
        b = Singleton()
        print(f"a.value = {a.value}")
        print(f"b.value = {b.value}")
        print(f"a is b = {a is b}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        s1 = Singleton()
        s2 = Singleton()
        s3 = Singleton()
        tests = [
            ("Singleton returns same instance", s1 is s2),
            ("All three are same", s1 is s2 is s3),
            ("Has value attribute", hasattr(s1, 'value') and s1.value == 42),
        ]
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
          {
            title: '@classmethod — Alternative Constructors',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Create a <code>Person</code> class with <code>name</code> and <code>age</code> attributes. Add two class methods:</p>
<ul>
<li><code>from_string(s)</code> — parses "name-age" format</li>
<li><code>from_dict(d)</code> — creates from a dictionary</li>
</ul>
<h3>Examples</h3>
<pre>p1 = Person("Alice", 30)
p2 = Person.from_string("Bob-25")
p3 = Person.from_dict({"name": "Eve", "age": 28})</pre>`,
            starterCode: `class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    @classmethod
    def from_string(cls, s):
        """Parse 'name-age' format string."""
        # TODO
        pass

    @classmethod
    def from_dict(cls, d):
        """Create from dict with 'name' and 'age' keys."""
        # TODO
        pass

    def __repr__(self):
        return f"Person('{self.name}', {self.age})"

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        p1 = Person("Alice", 30)
        p2 = Person.from_string("Bob-25")
        p3 = Person.from_dict({"name": "Eve", "age": 28})
        print(f"p1 = {p1}")
        print(f"p2 = {p2}")
        print(f"p3 = {p3}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        p2 = Person.from_string("Bob-25")
        p3 = Person.from_dict({"name": "Eve", "age": 28})
        tests = [
            ("from_string name", p2.name == "Bob"),
            ("from_string age", p2.age == 25),
            ("from_dict name", p3.name == "Eve"),
            ("from_dict age", p3.age == 28),
            ("returns Person instance", isinstance(p2, Person) and isinstance(p3, Person)),
        ]
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
          {
            title: '@property — Pythonic Getters/Setters',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Create a <code>Temperature</code> class that stores temperature in Celsius internally. Add a <code>fahrenheit</code> property with getter and setter that converts automatically.</p>
<h3>Formula</h3>
<pre>F = C * 9/5 + 32
C = (F - 32) * 5/9</pre>`,
            starterCode: `class Temperature:
    def __init__(self, celsius=0):
        self.celsius = celsius

    @property
    def fahrenheit(self):
        """Return temperature in Fahrenheit."""
        # TODO
        pass

    @fahrenheit.setter
    def fahrenheit(self, value):
        """Set temperature using Fahrenheit value."""
        # TODO
        pass

    def __repr__(self):
        return f"Temperature({self.celsius}°C)"

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        t = Temperature(100)
        print(f"100°C = {t.fahrenheit}°F")
        t.fahrenheit = 32
        print(f"32°F = {t.celsius}°C")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        t1 = Temperature(0)
        t2 = Temperature(100)
        tests = [
            ("0°C = 32°F", t1.fahrenheit == 32),
            ("100°C = 212°F", t2.fahrenheit == 212),
        ]
        t1.fahrenheit = 212
        tests.append(("Set 212°F = 100°C", t1.celsius == 100))
        t2.fahrenheit = 32
        tests.append(("Set 32°F = 0°C", t2.celsius == 0))
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
          {
            title: '__slots__ — Memory Optimization',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Create two classes: <code>PointRegular</code> (normal) and <code>PointSlots</code> (with <code>__slots__</code>), both with <code>x</code> and <code>y</code> attributes. Compare their memory usage by creating 10,000 instances of each.</p>
<h3>Key Concept</h3>
<p><code>__slots__</code> eliminates <code>__dict__</code> per instance, saving ~40-50% memory.</p>`,
            starterCode: `import sys

class PointRegular:
    def __init__(self, x, y):
        self.x = x
        self.y = y

class PointSlots:
    __slots__ = ('x', 'y')

    def __init__(self, x, y):
        # TODO: set x and y
        pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        p1 = PointRegular(1, 2)
        p2 = PointSlots(1, 2)
        reg_size = sys.getsizeof(p1) + sys.getsizeof(p1.__dict__)
        slot_size = sys.getsizeof(p2)
        print(f"Regular: {reg_size} bytes (obj + __dict__)")
        print(f"Slots:   {slot_size} bytes")
        print(f"Savings: {reg_size - slot_size} bytes per object")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        p = PointSlots(3, 4)
        tests = [
            ("Slots x works", p.x == 3),
            ("Slots y works", p.y == 4),
            ("No __dict__", not hasattr(p, '__dict__')),
            ("Has __slots__", hasattr(PointSlots, '__slots__')),
            ("Cannot add attr", False),
        ]
        try:
            p.z = 5
            tests[4] = ("Cannot add arbitrary attr", False)
        except AttributeError:
            tests[4] = ("Cannot add arbitrary attr", True)
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
      {
        label: '1.2 Inheritance Deep Dive',
        problems: [
          {
            title: 'MRO & super() in Diamond Inheritance',
            difficulty: 'Hard',
            description: `<h3>Problem</h3>
<p>Create a diamond inheritance structure: <code>A</code> → <code>B</code>, <code>C</code> → <code>D</code>. Each class should have a <code>greet()</code> method that calls <code>super().greet()</code> and appends its name to a list. Verify the MRO is correct.</p>`,
            starterCode: `class A:
    def greet(self):
        return ['A']

class B(A):
    def greet(self):
        # TODO: call super and add 'B'
        pass

class C(A):
    def greet(self):
        # TODO: call super and add 'C'
        pass

class D(B, C):
    def greet(self):
        # TODO: call super and add 'D'
        pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        d = D()
        result = d.greet()
        print(f"Greet order: {result}")
        print(f"MRO: {[cls.__name__ for cls in D.__mro__]}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        d = D()
        result = d.greet()
        mro_names = [cls.__name__ for cls in D.__mro__]
        tests = [
            ("D calls all classes", set(result) == {'A', 'B', 'C', 'D'}),
            ("MRO is D,B,C,A,object", mro_names == ['D', 'B', 'C', 'A', 'object']),
            ("D is first", result[-1] == 'D' or result[0] == 'D'),
            ("Result has 4 elements", len(result) == 4),
        ]
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
          {
            title: 'Abstract Base Classes',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Create an abstract class <code>Shape</code> with abstract methods <code>area()</code> and <code>perimeter()</code>. Implement <code>Circle</code> and <code>Rectangle</code> subclasses.</p>`,
            starterCode: `from abc import ABC, abstractmethod
import math

class Shape(ABC):
    @abstractmethod
    def area(self):
        pass

    @abstractmethod
    def perimeter(self):
        pass

class Circle(Shape):
    def __init__(self, radius):
        self.radius = radius

    def area(self):
        # TODO
        pass

    def perimeter(self):
        # TODO
        pass

class Rectangle(Shape):
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def area(self):
        # TODO
        pass

    def perimeter(self):
        # TODO
        pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        c = Circle(5)
        r = Rectangle(3, 4)
        print(f"Circle(5): area={c.area():.2f}, perimeter={c.perimeter():.2f}")
        print(f"Rect(3,4): area={r.area():.2f}, perimeter={r.perimeter():.2f}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        c = Circle(5)
        r = Rectangle(3, 4)
        tests = [
            ("Circle area", abs(c.area() - math.pi * 25) < 0.01),
            ("Circle perimeter", abs(c.perimeter() - 2 * math.pi * 5) < 0.01),
            ("Rectangle area", r.area() == 12),
            ("Rectangle perimeter", r.perimeter() == 14),
            ("Cannot instantiate Shape", False),
        ]
        try:
            Shape()
            tests[4] = ("Cannot instantiate Shape", False)
        except TypeError:
            tests[4] = ("Cannot instantiate Shape", True)
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
      {
        label: '1.3 Composition & Delegation',
        problems: [
          {
            title: 'Composition over Inheritance',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Build an <code>Engine</code> and a <code>Car</code> class using composition (not inheritance). The car has an engine. Implement <code>start()</code>, <code>stop()</code>, and <code>status()</code> on Car that delegate to Engine.</p>`,
            starterCode: `class Engine:
    def __init__(self, horsepower):
        self.horsepower = horsepower
        self.running = False

    def start(self):
        self.running = True
        return f"Engine ({self.horsepower}hp) started"

    def stop(self):
        self.running = False
        return f"Engine ({self.horsepower}hp) stopped"

class Car:
    def __init__(self, model, horsepower):
        self.model = model
        # TODO: create engine via composition
        pass

    def start(self):
        # TODO: delegate to engine
        pass

    def stop(self):
        # TODO: delegate to engine
        pass

    def status(self):
        # TODO: return "Model: running/stopped"
        pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        car = Car("Tesla", 300)
        print(car.start())
        print(car.status())
        print(car.stop())
        print(car.status())
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        car = Car("BMW", 250)
        tests = [
            ("Car has engine", hasattr(car, 'engine') and isinstance(car.engine, Engine)),
            ("Start works", 'started' in car.start().lower() or 'start' in car.start().lower()),
            ("Engine is running", car.engine.running == True),
            ("Stop works", 'stopped' in car.stop().lower() or 'stop' in car.stop().lower()),
            ("Engine is stopped", car.engine.running == False),
        ]
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
      {
        label: '1.4 Dunder Methods',
        problems: [
          {
            title: 'Custom Container — __getitem__, __len__, __contains__',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Build a <code>Playlist</code> class that supports: <code>len()</code>, indexing with <code>[]</code>, <code>in</code> operator, and iteration.</p>`,
            starterCode: `class Playlist:
    def __init__(self, name):
        self.name = name
        self._songs = []

    def add(self, song):
        self._songs.append(song)

    def __len__(self):
        # TODO
        pass

    def __getitem__(self, index):
        # TODO: support indexing and slicing
        pass

    def __contains__(self, song):
        # TODO
        pass

    def __iter__(self):
        # TODO
        pass

    def __repr__(self):
        return f"Playlist('{self.name}', {len(self._songs)} songs)"

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        pl = Playlist("Chill")
        pl.add("Song A")
        pl.add("Song B")
        pl.add("Song C")
        print(f"Length: {len(pl)}")
        print(f"First: {pl[0]}")
        print(f"'Song B' in playlist: {'Song B' in pl}")
        print(f"Iteration: {[s for s in pl]}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        pl = Playlist("Test")
        pl.add("A"); pl.add("B"); pl.add("C")
        tests = [
            ("len works", len(pl) == 3),
            ("indexing works", pl[0] == "A" and pl[2] == "C"),
            ("contains works", "B" in pl and "Z" not in pl),
            ("iteration works", list(pl) == ["A", "B", "C"]),
            ("negative index", pl[-1] == "C"),
        ]
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
          {
            title: '__call__ — Callable Objects',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Build a <code>Counter</code> class that can be called like a function. Each call increments and returns the count. It should also support <code>reset()</code>.</p>`,
            starterCode: `class Counter:
    def __init__(self, start=0):
        self.count = start

    def __call__(self):
        # TODO: increment and return count
        pass

    def reset(self):
        self.count = 0

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        c = Counter()
        print(c())  # 1
        print(c())  # 2
        print(c())  # 3
        c.reset()
        print(c())  # 1
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        c = Counter()
        tests = [
            ("First call returns 1", c() == 1),
            ("Second call returns 2", c() == 2),
            ("Third call returns 3", c() == 3),
        ]
        c.reset()
        tests.append(("After reset returns 1", c() == 1))
        c2 = Counter(10)
        tests.append(("Custom start", c2() == 11))
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
      {
        label: '1.5 Descriptors',
        problems: [
          {
            title: 'Typed Descriptor — Enforce Types',
            difficulty: 'Hard',
            description: `<h3>Problem</h3>
<p>Build a <code>Typed</code> descriptor that enforces a specific type on assignment. Use it to create a <code>Person</code> class where <code>name</code> must be str and <code>age</code> must be int.</p>`,
            starterCode: `class Typed:
    def __init__(self, expected_type):
        self.expected_type = expected_type
        self.name = None

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get(self.name)

    def __set__(self, obj, value):
        # TODO: validate type, raise TypeError if wrong
        pass

class Person:
    name = Typed(str)
    age = Typed(int)

    def __init__(self, name, age):
        self.name = name
        self.age = age

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        p = Person("Alice", 30)
        print(f"name={p.name}, age={p.age}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        p = Person("Alice", 30)
        tests = [
            ("Valid creation", p.name == "Alice" and p.age == 30),
            ("Update valid", True),
        ]
        p.name = "Bob"
        tests[1] = ("Update valid", p.name == "Bob")

        try:
            p.name = 123
            tests.append(("Reject bad name type", False))
        except TypeError:
            tests.append(("Reject bad name type", True))

        try:
            p.age = "thirty"
            tests.append(("Reject bad age type", False))
        except TypeError:
            tests.append(("Reject bad age type", True))

        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
      {
        label: '1.6 Metaclasses',
        problems: [
          {
            title: 'Registry Metaclass',
            difficulty: 'Hard',
            description: `<h3>Problem</h3>
<p>Create a metaclass <code>RegistryMeta</code> that automatically registers all subclasses of a base class in a <code>registry</code> dict. The key is the class name, the value is the class itself.</p>`,
            starterCode: `class RegistryMeta(type):
    registry = {}

    def __new__(mcs, name, bases, namespace):
        cls = super().__new__(mcs, name, bases, namespace)
        # TODO: register class in registry (skip the base class itself)
        pass
        return cls

class Plugin(metaclass=RegistryMeta):
    """Base class — subclasses auto-register."""
    pass

class AuthPlugin(Plugin):
    name = "auth"

class CachePlugin(Plugin):
    name = "cache"

class LogPlugin(Plugin):
    name = "log"

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        print(f"Registry: {RegistryMeta.registry}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        reg = RegistryMeta.registry
        tests = [
            ("AuthPlugin registered", "AuthPlugin" in reg and reg["AuthPlugin"] is AuthPlugin),
            ("CachePlugin registered", "CachePlugin" in reg and reg["CachePlugin"] is CachePlugin),
            ("LogPlugin registered", "LogPlugin" in reg and reg["LogPlugin"] is LogPlugin),
            ("Base Plugin not in registry", "Plugin" not in reg),
        ]
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
    ],
  },

  // ── Phase 2: Functions — Advanced Patterns ──
  {
    id: 'functions',
    phase: 2,
    title: 'Functions — Advanced Patterns',
    icon: '⚡',
    color: '#2563eb',
    topics: [
      {
        label: '2.1 Closures & First-Class Functions',
        problems: [
          {
            title: 'Closure — Running Average',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Write a function <code>make_averager()</code> that returns a closure which keeps a running average. Each call with a new number updates and returns the average.</p>`,
            starterCode: `def make_averager():
    """Return a closure that computes running average."""
    # TODO: use closure to track numbers
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        avg = make_averager()
        print(avg(10))  # 10.0
        print(avg(20))  # 15.0
        print(avg(30))  # 20.0
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        avg = make_averager()
        tests = [
            ("First value", avg(10) == 10.0),
            ("Running avg 2", avg(20) == 15.0),
            ("Running avg 3", avg(30) == 20.0),
            ("Running avg 4", avg(40) == 25.0),
        ]
        avg2 = make_averager()
        tests.append(("Independent closures", avg2(100) == 100.0))
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
      {
        label: '2.2 Decorators',
        problems: [
          {
            title: 'Timing Decorator',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Write a <code>@timer</code> decorator that prints how long a function takes to execute. Use <code>functools.wraps</code> to preserve metadata.</p>`,
            starterCode: `import time
import functools

def timer(func):
    """Decorator that prints execution time."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # TODO: measure time and print it
        pass
    return wrapper

@timer
def slow_function(n):
    """A slow function for testing."""
    time.sleep(n)
    return f"Done after {n}s"

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        result = slow_function(0.1)
        print(f"Result: {result}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        start = time.time()
        result = slow_function(0.1)
        elapsed = time.time() - start
        tests = [
            ("Returns correct value", result == "Done after 0.1s"),
            ("Preserves __name__", slow_function.__name__ == "slow_function"),
            ("Preserves __doc__", slow_function.__doc__ == "A slow function for testing."),
            ("Actually waits", elapsed >= 0.09),
        ]
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
          {
            title: 'Retry Decorator with Backoff',
            difficulty: 'Hard',
            description: `<h3>Problem</h3>
<p>Write a <code>@retry(max_attempts, delay)</code> decorator that retries a function on exception up to <code>max_attempts</code> times, waiting <code>delay</code> seconds between retries.</p>`,
            starterCode: `import functools
import time

def retry(max_attempts=3, delay=0.1):
    """Decorator factory: retry on exception."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # TODO: retry logic with delay between attempts
            pass
        return wrapper
    return decorator

call_count = 0

@retry(max_attempts=3, delay=0.05)
def flaky_function():
    """Fails first 2 times, succeeds on 3rd."""
    global call_count
    call_count += 1
    if call_count < 3:
        raise ConnectionError(f"Attempt {call_count} failed")
    return "success"

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        call_count = 0
        result = flaky_function()
        print(f"Result: {result}, took {call_count} attempts")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        call_count = 0
        result = flaky_function()
        tests = [
            ("Eventually succeeds", result == "success"),
            ("Took 3 attempts", call_count == 3),
            ("Preserves name", flaky_function.__name__ == "flaky_function"),
        ]

        # Test that it raises after max attempts
        attempt_count = 0
        @retry(max_attempts=2, delay=0.01)
        def always_fails():
            global attempt_count
            attempt_count += 1
            raise ValueError("always fails")

        try:
            attempt_count = 0
            always_fails()
            tests.append(("Raises after max", False))
        except ValueError:
            tests.append(("Raises after max", attempt_count == 2))

        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
      {
        label: '2.3 Generators & Iterators',
        problems: [
          {
            title: 'Generator Pipeline — Data Processing',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Build a generator pipeline: <code>integers()</code> → <code>squares()</code> → <code>evens()</code> using <code>yield</code> and <code>yield from</code> or chaining. Take first N results from the pipeline.</p>`,
            starterCode: `def integers(start=1):
    """Infinite generator of integers starting from start."""
    # TODO
    pass

def squares(nums):
    """Generator that yields squares of input numbers."""
    # TODO
    pass

def evens(nums):
    """Generator that yields only even numbers."""
    # TODO
    pass

def take(n, gen):
    """Take first n items from a generator."""
    # TODO
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        pipeline = evens(squares(integers()))
        result = take(5, pipeline)
        print(f"First 5 even squares: {result}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        pipeline = evens(squares(integers()))
        result = take(5, pipeline)
        tests = [
            ("Correct first 5 even squares", result == [4, 16, 36, 64, 100]),
            ("take(3) works", take(3, evens(squares(integers()))) == [4, 16, 36]),
            ("integers is generator", hasattr(integers(), '__next__')),
            ("squares is generator", hasattr(squares(iter([])), '__next__')),
        ]
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
    ],
  },

  // ── Phase 3: Memory Management ──
  {
    id: 'memory',
    phase: 3,
    title: 'Memory Management',
    icon: '🧠',
    color: '#dc2626',
    topics: [
      {
        label: '3.1 Reference Counting & Weak References',
        problems: [
          {
            title: 'WeakRef Cache',
            difficulty: 'Hard',
            description: `<h3>Problem</h3>
<p>Build a <code>WeakCache</code> class that stores objects using weak references. When the original object is garbage collected, the cache entry should automatically disappear.</p>`,
            starterCode: `import weakref

class WeakCache:
    def __init__(self):
        self._cache = weakref.WeakValueDictionary()

    def put(self, key, value):
        # TODO
        pass

    def get(self, key, default=None):
        # TODO
        pass

    def __len__(self):
        return len(self._cache)

    def keys(self):
        return list(self._cache.keys())

class BigObject:
    def __init__(self, name):
        self.name = name
        self.data = [0] * 1000

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    import gc
    try:
        cache = WeakCache()
        obj = BigObject("test")
        cache.put("key1", obj)
        print(f"Cache size: {len(cache)}")
        print(f"Get key1: {cache.get('key1').name}")
        del obj
        gc.collect()
        print(f"After del+gc, size: {len(cache)}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        import gc
        cache = WeakCache()
        o1 = BigObject("A")
        o2 = BigObject("B")
        cache.put("a", o1)
        cache.put("b", o2)
        tests = [
            ("Size is 2", len(cache) == 2),
            ("Get works", cache.get("a").name == "A"),
            ("Missing returns default", cache.get("x") is None),
        ]
        del o1
        gc.collect()
        tests.append(("After del, size is 1", len(cache) == 1))
        tests.append(("Deleted key gone", cache.get("a") is None))
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
      {
        label: '3.2 Memory Profiling',
        problems: [
          {
            title: 'tracemalloc — Find Memory Hogs',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Use <code>tracemalloc</code> to measure memory usage of different data structures. Compare: list of dicts vs list of tuples vs list of namedtuples for storing 10,000 records.</p>`,
            starterCode: `import tracemalloc
from collections import namedtuple

Record = namedtuple('Record', ['name', 'age', 'city'])

def measure_dicts(n):
    return [{"name": f"user_{i}", "age": i % 100, "city": f"city_{i % 50}"} for i in range(n)]

def measure_tuples(n):
    return [(f"user_{i}", i % 100, f"city_{i % 50}") for i in range(n)]

def measure_namedtuples(n):
    return [Record(f"user_{i}", i % 100, f"city_{i % 50}") for i in range(n)]

def compare_memory(n=10000):
    """Compare memory usage of three approaches. Return dict of results."""
    results = {}

    # TODO: Use tracemalloc to measure each approach
    # Hint: tracemalloc.start(), take snapshot, get traced memory
    pass

    return results

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        results = compare_memory(10000)
        for k, v in results.items():
            print(f"{k}: {v / 1024:.1f} KB")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        results = compare_memory(10000)
        tests = [
            ("Has dict measurement", "dicts" in results and results["dicts"] > 0),
            ("Has tuple measurement", "tuples" in results and results["tuples"] > 0),
            ("Has namedtuple measurement", "namedtuples" in results and results["namedtuples"] > 0),
            ("Tuples use less than dicts", results.get("tuples", float('inf')) < results.get("dicts", 0)),
        ]
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
    ],
  },

  // ── Phase 4: Concurrency & Parallelism ──
  {
    id: 'concurrency',
    phase: 4,
    title: 'Concurrency & Parallelism',
    icon: '🔄',
    color: '#0891b2',
    topics: [
      {
        label: '4.1 Threading',
        problems: [
          {
            title: 'Thread-Safe Counter with Lock',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Build a <code>SafeCounter</code> that can be incremented from multiple threads without race conditions.</p>`,
            starterCode: `import threading

class SafeCounter:
    def __init__(self):
        self.value = 0
        self._lock = threading.Lock()

    def increment(self):
        # TODO: thread-safe increment
        pass

    def get(self):
        return self.value

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        counter = SafeCounter()
        threads = []
        for _ in range(10):
            t = threading.Thread(target=lambda: [counter.increment() for _ in range(1000)])
            threads.append(t)
            t.start()
        for t in threads:
            t.join()
        print(f"Final count: {counter.get()} (expected 10000)")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        counter = SafeCounter()
        threads = []
        for _ in range(10):
            t = threading.Thread(target=lambda: [counter.increment() for _ in range(1000)])
            threads.append(t)
            t.start()
        for t in threads:
            t.join()
        tests = [
            ("Thread-safe count", counter.get() == 10000),
            ("Has lock", hasattr(counter, '_lock')),
            ("Lock is Lock type", isinstance(counter._lock, type(threading.Lock()))),
        ]
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
      {
        label: '4.2 Producer-Consumer Pattern',
        problems: [
          {
            title: 'Producer-Consumer with Queue',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Implement a producer-consumer pattern using <code>queue.Queue</code>. Producer generates items, consumer processes them, using a sentinel value to signal completion.</p>`,
            starterCode: `import queue
import threading

SENTINEL = None  # signals end of production

def producer(q, items):
    """Put items into queue, then put SENTINEL."""
    # TODO
    pass

def consumer(q):
    """Get items from queue until SENTINEL. Return list of processed items."""
    # TODO
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        q = queue.Queue()
        items = [1, 2, 3, 4, 5]
        results = []

        p = threading.Thread(target=producer, args=(q, items))
        c = threading.Thread(target=lambda: results.extend(consumer(q)))
        p.start()
        c.start()
        p.join()
        c.join()
        print(f"Produced: {items}")
        print(f"Consumed: {results}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        q = queue.Queue()
        items = [10, 20, 30]
        results = []

        p = threading.Thread(target=producer, args=(q, items))
        c = threading.Thread(target=lambda: results.extend(consumer(q)))
        p.start()
        c.start()
        p.join()
        c.join()
        tests = [
            ("All items consumed", results == [10, 20, 30]),
            ("Queue is empty", q.empty()),
            ("Correct count", len(results) == 3),
        ]
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
    ],
  },

  // ── Phase 5: Design Patterns ──
  {
    id: 'patterns',
    phase: 5,
    title: 'Design Patterns',
    icon: '🏗️',
    color: '#ea580c',
    topics: [
      {
        label: '5.1 Creational Patterns',
        problems: [
          {
            title: 'Factory Pattern with Registry',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Build a <code>ShapeFactory</code> with a registry. Users register shape classes, then create shapes by name.</p>`,
            starterCode: `class ShapeFactory:
    _registry = {}

    @classmethod
    def register(cls, name, shape_cls):
        # TODO
        pass

    @classmethod
    def create(cls, name, **kwargs):
        # TODO: create and return instance, raise ValueError if unknown
        pass

class Circle:
    def __init__(self, radius=1):
        self.radius = radius
    def area(self):
        import math
        return math.pi * self.radius ** 2

class Square:
    def __init__(self, side=1):
        self.side = side
    def area(self):
        return self.side ** 2

# Register shapes
ShapeFactory.register("circle", Circle)
ShapeFactory.register("square", Square)

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        c = ShapeFactory.create("circle", radius=5)
        s = ShapeFactory.create("square", side=4)
        print(f"Circle area: {c.area():.2f}")
        print(f"Square area: {s.area():.2f}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        c = ShapeFactory.create("circle", radius=5)
        s = ShapeFactory.create("square", side=4)
        import math
        tests = [
            ("Circle created", isinstance(c, Circle)),
            ("Circle area", abs(c.area() - math.pi * 25) < 0.01),
            ("Square created", isinstance(s, Square)),
            ("Square area", s.area() == 16),
        ]
        try:
            ShapeFactory.create("triangle")
            tests.append(("Unknown raises error", False))
        except (ValueError, KeyError):
            tests.append(("Unknown raises error", True))
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
          {
            title: 'Strategy Pattern',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Implement a <code>Sorter</code> that can switch between sorting strategies at runtime. Strategies: bubble sort, python built-in sort.</p>`,
            starterCode: `def bubble_sort(data):
    """Bubble sort implementation."""
    arr = list(data)
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr

def builtin_sort(data):
    return sorted(data)

class Sorter:
    def __init__(self, strategy=None):
        # TODO: store strategy
        pass

    def set_strategy(self, strategy):
        # TODO
        pass

    def sort(self, data):
        # TODO: use current strategy
        pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        s = Sorter(bubble_sort)
        print(s.sort([3, 1, 4, 1, 5]))
        s.set_strategy(builtin_sort)
        print(s.sort([3, 1, 4, 1, 5]))
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        data = [5, 3, 8, 1, 9, 2]
        s = Sorter(bubble_sort)
        tests = [
            ("Bubble sort works", s.sort(data) == [1, 2, 3, 5, 8, 9]),
        ]
        s.set_strategy(builtin_sort)
        tests.append(("Builtin sort works", s.sort(data) == [1, 2, 3, 5, 8, 9]))
        tests.append(("Strategy switchable", True))
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
      {
        label: '5.2 Behavioral Patterns',
        problems: [
          {
            title: 'Observer Pattern — Event System',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Build an event system with <code>EventEmitter</code>. Support <code>on(event, callback)</code>, <code>emit(event, *args)</code>, and <code>off(event, callback)</code>.</p>`,
            starterCode: `class EventEmitter:
    def __init__(self):
        self._listeners = {}

    def on(self, event, callback):
        """Register a callback for an event."""
        # TODO
        pass

    def off(self, event, callback):
        """Remove a callback for an event."""
        # TODO
        pass

    def emit(self, event, *args):
        """Call all callbacks registered for this event."""
        # TODO
        pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        em = EventEmitter()
        log = []
        em.on("click", lambda x: log.append(f"clicked {x}"))
        em.on("click", lambda x: log.append(f"also clicked {x}"))
        em.emit("click", "button")
        print(f"Log: {log}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        em = EventEmitter()
        results = []
        cb1 = lambda x: results.append(f"a:{x}")
        cb2 = lambda x: results.append(f"b:{x}")
        em.on("test", cb1)
        em.on("test", cb2)
        em.emit("test", "hello")
        tests = [
            ("Both callbacks fired", len(results) == 2),
            ("Correct values", "a:hello" in results and "b:hello" in results),
        ]
        em.off("test", cb1)
        results.clear()
        em.emit("test", "world")
        tests.append(("Off removes callback", len(results) == 1 and "b:world" in results))
        results.clear()
        em.emit("nonexistent", "x")
        tests.append(("No error on unknown event", True))
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
    ],
  },

  // ── Phase 6: Error Handling ──
  {
    id: 'errors',
    phase: 6,
    title: 'Error Handling & Defensive Programming',
    icon: '🛡️',
    color: '#059669',
    topics: [
      {
        label: '6.1 Exception Handling',
        problems: [
          {
            title: 'Custom Exceptions & Chaining',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Create a custom exception hierarchy for a banking app: <code>BankError</code> → <code>InsufficientFunds</code>, <code>AccountNotFound</code>. Implement a <code>transfer()</code> that uses exception chaining.</p>`,
            starterCode: `class BankError(Exception):
    """Base exception for banking operations."""
    pass

class InsufficientFunds(BankError):
    def __init__(self, account, amount, balance):
        self.account = account
        self.amount = amount
        self.balance = balance
        super().__init__(f"Account {account}: tried to withdraw {amount}, balance is {balance}")

class AccountNotFound(BankError):
    def __init__(self, account):
        self.account = account
        super().__init__(f"Account '{account}' not found")

class Bank:
    def __init__(self):
        self.accounts = {}

    def create(self, name, balance=0):
        self.accounts[name] = balance

    def transfer(self, from_acc, to_acc, amount):
        """Transfer amount between accounts. Use exception chaining."""
        # TODO: raise appropriate exceptions
        pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        bank = Bank()
        bank.create("Alice", 100)
        bank.create("Bob", 50)
        bank.transfer("Alice", "Bob", 30)
        print(f"Alice: {bank.accounts['Alice']}, Bob: {bank.accounts['Bob']}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        bank = Bank()
        bank.create("A", 100)
        bank.create("B", 50)
        bank.transfer("A", "B", 30)
        tests = [
            ("Transfer works", bank.accounts["A"] == 70 and bank.accounts["B"] == 80),
        ]
        try:
            bank.transfer("A", "B", 999)
            tests.append(("Insufficient funds", False))
        except InsufficientFunds as e:
            tests.append(("Insufficient funds", e.account == "A" and e.amount == 999))
        try:
            bank.transfer("X", "B", 10)
            tests.append(("Account not found", False))
        except AccountNotFound as e:
            tests.append(("Account not found", e.account == "X"))
        tests.append(("InsufficientFunds is BankError", issubclass(InsufficientFunds, BankError)))
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
      {
        label: '6.2 Context Managers',
        problems: [
          {
            title: 'Custom Context Manager — Timer',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Build a context manager <code>Timer</code> that measures the time spent inside a <code>with</code> block. Support both class-based and generator-based approaches.</p>`,
            starterCode: `import time
from contextlib import contextmanager

class Timer:
    """Class-based context manager that times a block."""
    def __init__(self, label="Block"):
        self.label = label
        self.elapsed = 0

    def __enter__(self):
        # TODO
        pass

    def __exit__(self, exc_type, exc_val, exc_tb):
        # TODO
        pass

@contextmanager
def timer(label="Block"):
    """Generator-based context manager that times a block."""
    # TODO
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        with Timer("Test") as t:
            time.sleep(0.1)
        print(f"Class-based: {t.elapsed:.2f}s")

        with timer("Test2") as t2:
            time.sleep(0.1)
        print(f"Generator-based: {t2['elapsed']:.2f}s")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        with Timer("T") as t:
            time.sleep(0.1)
        tests = [
            ("Class timer works", t.elapsed >= 0.09),
            ("Elapsed is float", isinstance(t.elapsed, float)),
        ]
        with timer("T2") as t2:
            time.sleep(0.1)
        tests.append(("Generator timer works", t2['elapsed'] >= 0.09))
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
    ],
  },

  // ── Phase 7: Testing ──
  {
    id: 'testing',
    phase: 7,
    title: 'Testing',
    icon: '🧪',
    color: '#6366f1',
    topics: [
      {
        label: '7.1 Unit Testing Patterns',
        problems: [
          {
            title: 'Write Testable Code — Dependency Injection',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Refactor a <code>UserService</code> class to use dependency injection so it can be tested without a real database. Create a <code>FakeDB</code> for testing.</p>`,
            starterCode: `class FakeDB:
    """In-memory fake database for testing."""
    def __init__(self):
        self.users = {}

    def save(self, user_id, data):
        self.users[user_id] = data

    def find(self, user_id):
        return self.users.get(user_id)

class UserService:
    def __init__(self, db):
        # TODO: store injected dependency
        pass

    def create_user(self, user_id, name, email):
        # TODO: save user to db
        pass

    def get_user(self, user_id):
        # TODO: find user in db
        pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        db = FakeDB()
        svc = UserService(db)
        svc.create_user("u1", "Alice", "alice@test.com")
        user = svc.get_user("u1")
        print(f"User: {user}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        db = FakeDB()
        svc = UserService(db)
        svc.create_user("u1", "Alice", "alice@test.com")
        tests = [
            ("Create user", svc.get_user("u1") is not None),
            ("Correct name", svc.get_user("u1")["name"] == "Alice"),
            ("Correct email", svc.get_user("u1")["email"] == "alice@test.com"),
            ("Not found returns None", svc.get_user("x") is None),
            ("Uses injected db", db.users.get("u1") is not None),
        ]
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
    ],
  },

  // ── Phase 8: Data Structures & Algorithms ──
  {
    id: 'ds-algo',
    phase: 8,
    title: 'Data Structures & Algorithms',
    icon: '📊',
    color: '#be185d',
    topics: [
      {
        label: '8.1 Collections Deep Dive',
        problems: [
          {
            title: 'defaultdict & Counter Patterns',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Use <code>Counter</code> and <code>defaultdict</code> to: (1) count word frequencies in a text, (2) group anagrams together.</p>`,
            starterCode: `from collections import Counter, defaultdict

def word_frequencies(text):
    """Return Counter of word frequencies (lowercase)."""
    # TODO
    pass

def group_anagrams(words):
    """Group anagram words together. Return list of lists."""
    # TODO: use defaultdict with sorted key
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        text = "the cat sat on the mat the cat"
        print(f"Frequencies: {word_frequencies(text)}")
        words = ["eat", "tea", "tan", "ate", "nat", "bat"]
        print(f"Anagram groups: {group_anagrams(words)}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        freq = word_frequencies("a b a c b a")
        tests = [
            ("Frequency count", freq["a"] == 3 and freq["b"] == 2 and freq["c"] == 1),
            ("Returns Counter", isinstance(freq, Counter)),
        ]
        groups = group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"])
        flat = [sorted(g) for g in groups]
        tests.append(("Anagram grouping", sorted(flat, key=lambda x: x[0]) == sorted([["ate", "eat", "tea"], ["nat", "tan"], ["bat"]], key=lambda x: x[0])))
        tests.append(("Returns list of lists", isinstance(groups, list) and all(isinstance(g, list) for g in groups)))
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
      {
        label: '8.2 Custom Data Structures',
        problems: [
          {
            title: 'LRU Cache from Scratch',
            difficulty: 'Hard',
            description: `<h3>Problem</h3>
<p>Implement an LRU Cache with <code>get(key)</code> and <code>put(key, value)</code> operations, both in O(1) time. Use <code>OrderedDict</code>.</p>`,
            starterCode: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.cache = OrderedDict()

    def get(self, key):
        """Return value if exists, else -1. Mark as recently used."""
        # TODO
        pass

    def put(self, key, value):
        """Insert or update. Evict LRU if at capacity."""
        # TODO
        pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        lru = LRUCache(2)
        lru.put(1, "a")
        lru.put(2, "b")
        print(lru.get(1))   # "a"
        lru.put(3, "c")     # evicts key 2
        print(lru.get(2))   # -1
        print(lru.get(3))   # "c"
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        lru = LRUCache(2)
        lru.put(1, "a")
        lru.put(2, "b")
        tests = [
            ("Get existing", lru.get(1) == "a"),
            ("Get missing", lru.get(99) == -1),
        ]
        lru.put(3, "c")  # should evict 2
        tests.append(("Evicts LRU", lru.get(2) == -1))
        tests.append(("New key accessible", lru.get(3) == "c"))
        lru.put(4, "d")  # should evict 1
        tests.append(("Evicts correct LRU after get", lru.get(1) == -1))
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
    ],
  },

  // ── Phase 9: Python Internals & Performance ──
  {
    id: 'internals',
    phase: 9,
    title: 'Python Internals & Performance',
    icon: '⚙️',
    color: '#64748b',
    topics: [
      {
        label: '9.1 CPython Internals',
        problems: [
          {
            title: 'Bytecode Inspection with dis',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Write functions to demonstrate when Python optimizations kick in: (1) integer interning, (2) string interning, (3) local vs global variable speed.</p>`,
            starterCode: `import dis
import sys

def demo_integer_interning():
    """Show that small integers (-5 to 256) are interned."""
    a = 256
    b = 256
    c = 257
    d = 257
    return {
        "256_is_same": a is b,
        "257_is_same": c is d,
    }

def demo_string_interning():
    """Show string interning behavior."""
    a = "hello"
    b = "hello"
    c = "hello world!"
    d = "hello world!"
    return {
        "simple_is_same": a is b,
        "space_is_same": c is d,
        "intern_works": sys.intern(c) is sys.intern(d),
    }

def demo_local_vs_global():
    """Show local variable access is faster than global.
    Return the bytecodes for both approaches."""
    # TODO: Return dict with 'local_ops' and 'global_ops' keys
    # Hint: use dis.get_instructions() to count LOAD_FAST vs LOAD_GLOBAL
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        print(f"Integer interning: {demo_integer_interning()}")
        print(f"String interning: {demo_string_interning()}")
        result = demo_local_vs_global()
        if result:
            print(f"Local vs Global: {result}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        int_result = demo_integer_interning()
        str_result = demo_string_interning()
        tests = [
            ("256 is interned", int_result["256_is_same"] == True),
            ("Simple strings interned", str_result["simple_is_same"] == True),
            ("sys.intern works", str_result["intern_works"] == True),
        ]
        lr = demo_local_vs_global()
        if lr:
            tests.append(("Returns local_ops", "local_ops" in lr))
        else:
            tests.append(("Returns result", False))
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
    ],
  },

  // ── Phase 10: Production Python ──
  {
    id: 'production',
    phase: 10,
    title: 'Production Python',
    icon: '🚀',
    color: '#16a34a',
    topics: [
      {
        label: '10.1 Dataclasses',
        problems: [
          {
            title: 'Frozen Dataclass with Validation',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Create an immutable <code>Config</code> dataclass with <code>__post_init__</code> validation. Fields: host (str), port (int 1-65535), debug (bool).</p>`,
            starterCode: `from dataclasses import dataclass, field

@dataclass(frozen=True)
class Config:
    host: str
    port: int
    debug: bool = False

    def __post_init__(self):
        # TODO: validate port range (1-65535)
        # Hint: use object.__setattr__ since frozen=True
        pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        cfg = Config("localhost", 8080, debug=True)
        print(f"Config: {cfg}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        cfg = Config("localhost", 8080)
        tests = [
            ("Creates valid config", cfg.host == "localhost" and cfg.port == 8080),
            ("Default debug False", cfg.debug == False),
            ("Is frozen", True),
        ]
        try:
            cfg.port = 9090
            tests[2] = ("Is frozen", False)
        except AttributeError:
            tests[2] = ("Is frozen", True)
        try:
            Config("x", 0)
            tests.append(("Rejects port 0", False))
        except ValueError:
            tests.append(("Rejects port 0", True))
        try:
            Config("x", 70000)
            tests.append(("Rejects port 70000", False))
        except ValueError:
            tests.append(("Rejects port 70000", True))
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
      {
        label: '10.2 SOLID Principles',
        problems: [
          {
            title: 'Dependency Inversion with Protocol',
            difficulty: 'Hard',
            description: `<h3>Problem</h3>
<p>Use <code>typing.Protocol</code> to define a <code>Logger</code> interface. Implement <code>ConsoleLogger</code> and <code>FileLogger</code> (fake). Create a <code>Service</code> that depends on the Protocol, not concrete classes.</p>`,
            starterCode: `from typing import Protocol, runtime_checkable

@runtime_checkable
class Logger(Protocol):
    def log(self, message: str) -> None: ...

class ConsoleLogger:
    def __init__(self):
        self.messages = []

    def log(self, message: str) -> None:
        self.messages.append(f"[CONSOLE] {message}")

class FileLogger:
    def __init__(self):
        self.messages = []

    def log(self, message: str) -> None:
        self.messages.append(f"[FILE] {message}")

class Service:
    def __init__(self, logger: Logger):
        # TODO
        pass

    def do_work(self, task: str):
        # TODO: log the task and return result
        pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        cl = ConsoleLogger()
        svc = Service(cl)
        svc.do_work("process data")
        print(f"Messages: {cl.messages}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        cl = ConsoleLogger()
        fl = FileLogger()
        tests = [
            ("ConsoleLogger is Logger", isinstance(cl, Logger)),
            ("FileLogger is Logger", isinstance(fl, Logger)),
        ]
        svc1 = Service(cl)
        svc1.do_work("task1")
        tests.append(("Console logs work", len(cl.messages) > 0 and "task1" in cl.messages[-1]))
        svc2 = Service(fl)
        svc2.do_work("task2")
        tests.append(("File logs work", len(fl.messages) > 0 and "task2" in fl.messages[-1]))
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
    ],
  },

  // ── Phase 11: Standard Library Deep Dives ──
  {
    id: 'stdlib',
    phase: 11,
    title: 'Standard Library Deep Dives',
    icon: '📚',
    color: '#9333ea',
    topics: [
      {
        label: '11.1 itertools Mastery',
        problems: [
          {
            title: 'itertools Combinatorics',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Use <code>itertools</code> to: (1) generate all pairs from a list, (2) create a sliding window, (3) flatten nested lists.</p>`,
            starterCode: `import itertools

def all_pairs(items):
    """Return all unique pairs using itertools.combinations."""
    # TODO
    pass

def sliding_window(iterable, n):
    """Return sliding windows of size n using itertools.islice."""
    # TODO
    pass

def flatten(nested):
    """Flatten nested lists using itertools.chain.from_iterable."""
    # TODO
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        print(f"Pairs: {all_pairs([1,2,3])}")
        print(f"Windows: {sliding_window([1,2,3,4,5], 3)}")
        print(f"Flatten: {flatten([[1,2],[3,4],[5]])}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        tests = [
            ("all_pairs", all_pairs([1,2,3]) == [(1,2),(1,3),(2,3)]),
            ("sliding_window", sliding_window([1,2,3,4,5], 3) == [(1,2,3),(2,3,4),(3,4,5)]),
            ("flatten", flatten([[1,2],[3,4],[5]]) == [1,2,3,4,5]),
            ("empty pairs", all_pairs([]) == []),
        ]
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
      {
        label: '11.2 pathlib & subprocess',
        problems: [
          {
            title: 'pathlib File Operations',
            difficulty: 'Easy',
            description: `<h3>Problem</h3>
<p>Write utility functions using <code>pathlib</code>: (1) find all Python files in a directory tree, (2) get file info (size, extension, parent), (3) safe file creation.</p>`,
            starterCode: `from pathlib import Path
import tempfile

def find_python_files(directory):
    """Find all .py files recursively. Return sorted list of Path objects."""
    # TODO: use Path.rglob()
    pass

def file_info(path):
    """Return dict with: name, stem, suffix, parent, size (if exists)."""
    p = Path(path)
    # TODO
    pass

def safe_write(path, content):
    """Write content to file, creating parent dirs if needed. Return Path."""
    p = Path(path)
    # TODO: use mkdir(parents=True, exist_ok=True) and write_text()
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        info = file_info("/tmp/test/hello.py")
        print(f"File info: {info}")
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        info = file_info("/tmp/test/hello.py")
        tests = [
            ("Has name", info["name"] == "hello.py"),
            ("Has stem", info["stem"] == "hello"),
            ("Has suffix", info["suffix"] == ".py"),
            ("Has parent", info["parent"] == "/tmp/test"),
        ]
        with tempfile.TemporaryDirectory() as td:
            p = safe_write(f"{td}/sub/dir/test.txt", "hello")
            tests.append(("safe_write creates file", p.exists() and p.read_text() == "hello"))
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
    ],
  },

  // ── Phase 12: Async/Await ──
  {
    id: 'async',
    phase: 12,
    title: 'Async/Await & asyncio',
    icon: '🌊',
    color: '#0284c7',
    topics: [
      {
        label: '12.1 asyncio Basics',
        problems: [
          {
            title: 'Async Gather & Semaphore',
            difficulty: 'Medium',
            description: `<h3>Problem</h3>
<p>Write an async function that fetches multiple URLs concurrently but limits concurrency to N using a semaphore. (Simulate with async sleep.)</p>`,
            starterCode: `import asyncio

async def fetch_url(url, delay=0.1):
    """Simulate fetching a URL with a delay."""
    await asyncio.sleep(delay)
    return f"Response from {url}"

async def fetch_all(urls, max_concurrent=3):
    """Fetch all URLs with max_concurrent limit using Semaphore."""
    # TODO: use asyncio.Semaphore to limit concurrency
    pass

# --- Test cases (do not modify) ---
if __name__ == "__main__":
    try:
        urls = [f"https://api.example.com/{i}" for i in range(5)]
        results = asyncio.run(fetch_all(urls, max_concurrent=2))
        for r in results:
            print(r)
    except Exception as e:
        print(f"ERROR: {e}")

    print("═══TEST_RESULTS═══")
    try:
        urls = [f"url_{i}" for i in range(5)]
        results = asyncio.run(fetch_all(urls, max_concurrent=2))
        tests = [
            ("Returns all results", len(results) == 5),
            ("Correct content", all("Response from" in r for r in results)),
            ("All URLs processed", all(f"url_{i}" in results[i] for i in range(5))),
        ]
        for i, (name, passed) in enumerate(tests):
            if passed:
                print(f"Test {i+1}: PASSED ✅  {name}")
            else:
                print(f"Test {i+1}: FAILED ❌  {name}")
    except Exception as e:
        print(f"Test ERROR: {e}")
`,
          },
        ],
      },
    ],
  },
]
