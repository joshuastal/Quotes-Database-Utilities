from enum import Enum

from pydantic import BaseModel, Field


class Tag(str, Enum):
    # Spiritual life and theology
    THEOSIS = "theosis"
    FAITH = "faith"
    HOPE = "hope"
    GRACE = "grace"
    SALVATION = "salvation"

    # Virtues and character
    HUMILITY = "humility"
    OBEDIENCE = "obedience"
    VIRTUES = "virtues"
    COMPASSION = "compassion"
    WISDOM = "wisdom"
    REPENTANCE = "repentance"
    LOVE = "love"
    SERVICE = "service"
    MERCY = "mercy"
    GRATITUDE = "gratitude"
    COURAGE = "courage"
    PEACE = "peace"
    JOY = "joy"
    GOODNESS = "goodness"
    SELF_CONTROL = "self_control"
    LONG_SUFFERING = "long-suffering"

    # Spiritual practices
    FASTING = "fasting"
    ALMSGIVING = "almsgiving"
    PRAYER = "prayer"
    READING = "reading"
    CHURCH_ATTENDANCE = "church_attendance"
    CONFESSION = "confession"
    COMMUNION = "communion"
    WORSHIP = "worship"
    SILENCE = "silence"
    SOLITUDE = "solitude"
    WATCHFULNESS = "watchfulness"
    DISCERNMENT = "discernment"
    DRYNESS = "dryness"

    # Thoughts and emotions
    ANGER = "anger"
    FEAR = "fear"
    DESPAIR = "despair"
    DOUBT = "doubt"
    LONELINESS = "loneliness"
    PRIDE = "pride"
    ENVY = "envy"
    SHAME = "shame"
    DISTRACTION = "distraction"

    # Temptations and habits
    TEMPTATION = "temptation"
    LUST = "lust"
    GREED = "greed"
    GLUTTONY = "gluttony"
    LAZINESS = "laziness"
    CONTENTMENT = "contentment"
    SIMPLICITY = "simplicity"

    # Speech and relationships
    COMMUNITY = "community"
    FAMILY = "family"
    MARRIAGE = "marriage"
    FORGIVENESS = "forgiveness"
    FRIENDSHIP = "friendship"
    PARENTING = "parenting"
    CHILDREN = "children"
    HOSPITALITY = "hospitality"
    GOSSIP = "gossip"
    JUDGEMENT = "judgement"
    TRUTHFULNESS = "truthfulness"
    LISTENING = "listening"
    ENCOURAGEMENT = "encouragement"

    # Work and daily responsibilities
    WORK = "work"
    MONEY = "money"
    STEWARDSHIP = "stewardship"
    DILIGENCE = "diligence"
    REST = "rest"
    RESPONSIBILITY = "responsibility"
    INTEGRITY = "integrity"

    # Hardship and mortality
    SUFFERING = "suffering"
    ILLNESS = "illness"
    DEATH = "death"
    FAILURE = "failure"
    PERSECUTION = "persecution"
    INJUSTICE = "injustice"
    BURNOUT = "burnout"

    # Personally added tags
    SCRIPTURE = "scripture"


class TagSchema(BaseModel):
    tags: list[Tag] = Field(min_length=1, max_length=3)
