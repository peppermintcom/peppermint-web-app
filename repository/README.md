This directory contains routines to persist entities to and restore entities
from the database layer.

domain.js containes entity type definitions, factories to create each type of
entities, and the types of the input for each factory. The factory of entity
type Message is a function named "message" and its input is type MessageParts.
All entities follow this naming convention.

For now Dynamo is the only data store so calls mostly pass through directly to
dynamo.
