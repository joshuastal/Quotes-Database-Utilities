import os
import threading


class ProgressBar:
    def __init__(
        self,
        total: int,
        prefix: str = "",
        suffix: str = "",
        decimals: int = 1,
        fill: str = "█",
    ) -> None:
        self.total = total
        self.progress = 0
        self.prefix = prefix
        self.suffix = suffix
        self.decimals = decimals
        self.fill = fill
        self._lock = threading.Lock()
        self._total_length = self._get_terminal_size()

    def _get_terminal_size(self) -> int:
        try:
            return os.get_terminal_size().columns
        except OSError:
            return 100

    def _get_progress_bar_to_print(self, bar: str, percent: str) -> str:
        return f"{self.prefix}({self.progress} / {self.total}) |{bar}| {percent}% {self.suffix}"

    def _get_length(self) -> int:
        len_to_print = len(self._get_progress_bar_to_print("", "")) + 4 + self.decimals
        return self._get_terminal_size() - len_to_print - 1

    def _print_progress_bar(self) -> None:
        percent = ("{0:." + str(self.decimals) + "f}").format(
            100 * (self.progress / float(self.total))
        )
        filled_length = int(self._get_length() * self.progress // self.total)
        bar = self.fill * filled_length + "-" * (self._get_length() - filled_length)
        print(
            "\r",
            self._get_progress_bar_to_print(bar, percent),
            sep="",
            end="",
            flush=True,
        )

        # Print New Line on Complete
        if self.progress == self.total:
            print()

    def print(self, *args: object) -> None:
        args_len = 0
        for a in [*args]:
            args_len += len(str(a)) + 1
        print("\r", *args, " " * (self._total_length - args_len - 1))
        self._print_progress_bar()

    def update_progress(self, progress: int) -> None:
        with self._lock:
            self.progress = progress
            self._print_progress_bar()

    def increment(self, amount: int = 1) -> None:
        with self._lock:
            self.progress = min(self.progress + amount, self.total)
            self._print_progress_bar()


# Locks have been added for multithreading safety
# Without the lock, two threads could read the same progress value and cause one increment to be lost.
# With this, one thread will acquire the lock before the other, increment, and release it
# The other one will wait till the lock is available before finishing its current task.
# All of this is handled automatically through with self._lock:
#
# Keeping the lock inside ProgressBar encapsulates its thread-safety and prevents
# callers from having to manage synchronization themselves.
#
# update_progress() and increment() use the same lock because multiple threads
# may share and modify this ProgressBar instance.
#
# Incrementing progress is a read-modify-write operation. Without the lock, two
# threads could read the same progress value and cause one increment to be lost.
# Their terminal output could also overlap.
#
# Only one thread can hold the lock at a time. If another thread reaches one of
# these methods while the lock is held, it waits until the lock is released.
# The with statement automatically releases the lock when the block exits.
#
# Keeping the lock inside ProgressBar encapsulates its synchronization and
# prevents callers from having to acquire the lock themselves.
