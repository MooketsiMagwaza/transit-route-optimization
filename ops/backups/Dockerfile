# Backup runner for the Compose "recovery" profile: logical dumps, base backups, encryption,
# off-host copy, retention, and verification. PostgreSQL 15 tools match the PostGIS 15 primary.
FROM postgres:15-alpine

RUN apk add --no-cache bash rclone openssl tzdata coreutils

COPY backup.sh restore-drill.sh /usr/local/bin/
RUN chmod 0755 /usr/local/bin/backup.sh /usr/local/bin/restore-drill.sh

ENV TZ=Africa/Gaborone
USER root
ENTRYPOINT ["/usr/local/bin/backup.sh"]
CMD ["scheduler"]
