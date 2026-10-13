"""Original 16:9 explainer: choose 2 letters from A, B, C.

On-screen words stay in English. The page around the file carries Chinese.
No LaTeX: formulas are set as text because this machine has no TeX install.
"""

from manim import (
    DOWN,
    RIGHT,
    UP,
    Circle,
    Create,
    FadeIn,
    FadeOut,
    Line,
    Scene,
    Text,
    VGroup,
    Write,
)

PAPER = "#F3F3F9"
INK = "#201F32"
INDIGO_INK = "#262EF2"
MUTED = "#8B8AA3"
HAIR = "#D7D6E0"


def disc(label, radius=0.42, filled=False):
    ring = Circle(
        radius=radius,
        stroke_color=INDIGO_INK if filled or len(label) > 1 else HAIR,
        stroke_width=3 if filled else 2,
        fill_color=INDIGO_INK if filled else "#FFFFFF",
        fill_opacity=1,
    )
    glyph = Text(
        label,
        font_size=30 if len(label) == 1 else 26,
        color="#FFFFFF" if filled else INK,
    )
    glyph.move_to(ring)
    return VGroup(ring, glyph)


class PermutationsVsCombinations(Scene):
    def construct(self):
        self.camera.background_color = PAPER

        question = Text(
            "Is AB a different choice from BA?",
            font_size=40,
            color=INK,
        )
        question.to_edge(UP, buff=0.38)

        root = Text("{ A, B, C }", font_size=36, color=INK)
        root.next_to(question, DOWN, buff=0.45)

        first = VGroup(
            disc("A"),
            disc("B"),
            disc("C"),
        ).arrange(RIGHT, buff=2.35)
        first.next_to(root, DOWN, buff=0.85)

        pairs = [
            ("AB", "A", True),
            ("AC", "A", True),
            ("BA", "B", False),
            ("BC", "B", True),
            ("CA", "C", False),
            ("CB", "C", False),
        ]
        parents = {"A": first[0], "B": first[1], "C": first[2]}
        leaves = VGroup()
        edges_down = VGroup()
        for label, parent_name, _keep in pairs:
            leaf = disc(label, radius=0.48, filled=False)
            leaves.add(leaf)
        leaves.arrange(RIGHT, buff=0.42)
        leaves.next_to(first, DOWN, buff=1.05)
        for leaf, (_label, parent_name, _keep) in zip(leaves, pairs):
            edges_down.add(
                Line(
                    parents[parent_name].get_bottom(),
                    leaf.get_top(),
                    stroke_color=HAIR,
                    stroke_width=2,
                )
            )

        edges_up = VGroup(
            *[
                Line(
                    root.get_bottom(),
                    node.get_top(),
                    stroke_color=HAIR,
                    stroke_width=2,
                )
                for node in first
            ]
        )

        orders = Text("6 orders", font_size=36, color=INDIGO_INK)
        piles = Text("3 piles", font_size=36, color=INDIGO_INK)
        counts = VGroup(orders, piles).arrange(RIGHT, buff=1.1)
        counts.next_to(leaves, DOWN, buff=0.42)

        formula_p = Text("P(3, 2) = 3! / 1! = 6", font_size=32, color=INK)
        formula_c = Text("C(3, 2) = 6 / 2! = 3", font_size=32, color=INK)
        formula_why = Text("Each pile was counted 2! times", font_size=30, color=MUTED)
        formulas = VGroup(formula_p, formula_c, formula_why).arrange(DOWN, buff=0.18)
        formulas.next_to(counts, DOWN, buff=0.28)

        # 0.00 The set
        self.play(FadeIn(question, shift=0.1 * UP), run_time=0.6)
        self.play(FadeIn(root, shift=0.15 * UP), run_time=0.7)
        self.wait(1.4)

        # 2.70 The tree
        self.play(Create(edges_up), FadeIn(first), run_time=1.3)
        self.play(Create(edges_down), FadeIn(leaves), run_time=1.6)
        self.wait(0.9)

        # 6.50 Six orders
        self.play(
            *[
                leaf[0].animate.set_stroke(color=INDIGO_INK, width=3.5)
                for leaf in leaves
            ],
            FadeIn(orders),
            run_time=0.8,
        )
        self.play(Write(formula_p), run_time=1.1)
        self.wait(2.2)

        # Fold the reverses. Kept pairs fill indigo; their reverses fade.
        dim = VGroup(
            *[leaves[index] for index, item in enumerate(pairs) if not item[2]]
        )
        keepers = [
            leaves[index] for index, item in enumerate(pairs) if item[2]
        ]
        self.play(
            dim.animate.set_opacity(0.28),
            *[
                keeper[0].animate.set_fill(INDIGO_INK, opacity=1).set_stroke(
                    color="#FFFFFF", width=0
                )
                for keeper in keepers
            ],
            *[keeper[1].animate.set_color("#FFFFFF") for keeper in keepers],
            FadeOut(orders),
            FadeIn(piles),
            run_time=1.1,
        )
        self.play(Write(formula_c), run_time=1.0)
        self.wait(1.5)

        # 13.60 Why divide by 2!
        self.play(FadeIn(formula_why, shift=0.1 * UP), run_time=0.7)
        self.wait(3.0)
