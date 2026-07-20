import os
import threading


class ProgressBar:
    def __init__(self, total, prefix="", suffix="", decimals=1, fill="█"):
        self.total = total
        self.progress = 0
        self.prefix = prefix
        self.suffix = suffix
        self.decimals = decimals
        self.fill = fill
        self._lock = threading.Lock()
        self._total_length = self._get_terminal_size()

    def _get_terminal_size(self):
        try:
            return os.get_terminal_size().columns
        except Exception:
            return 100

    def _get_progress_bar_to_print(self, bar, percent):
        return f"{self.prefix}({self.progress} / {self.total}) |{bar}| {percent}% {self.suffix}"

    def _get_length(self):
        len_to_print = len(self._get_progress_bar_to_print("", "")) + 4 + self.decimals
        return self._get_terminal_size() - len_to_print - 1

    def _print_progress_bar(self):
        percent = ("{0:." + str(self.decimals) + "f}").format(
            100 * (self.progress / float(self.total))
        )
        filled_length = int(self._get_length() * self.progress // self.total)
        bar = self.fill * filled_length + "-" * (self._get_length() - filled_length)
        print("\r", self._get_progress_bar_to_print(bar, percent), end="")
        # Print New Line on Complete
        if self.progress == self.total:
            print()

    def print(self, *args):
        args_len = 0
        for a in [*args]:
            args_len += len(str(a)) + 1
        print("\r", *args, " " * (self._total_length - args_len - 1))
        self._print_progress_bar()

    def update_progress(self, progress):
        with self._lock:
            self.progress = progress
            self._print_progress_bar()

    def increment(self, amount: int = 1) -> None:
        with self._lock:
            self.progress = min(self.progress + amount, self.total)
            self._print_progress_bar()
