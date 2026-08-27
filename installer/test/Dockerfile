FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends \
    python3 bash ca-certificates adduser tar rsync jq nginx openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/keel
COPY installer /opt/keel/installer

CMD ["bash", "/opt/keel/installer/test/run.sh"]
