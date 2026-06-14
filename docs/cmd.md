# 查看redis用户数据
docker exec -it brain-games-redis redis-cli KEYS "*"
# user
docker exec -it brain-games-redis redis-cli GET "perm:cmqc5n7kq0008sqnif6gbyz0h"
docker exec -it brain-games-redis redis-cli TTL "perm:cmqc5n7kq0008sqnif6gbyz0h"
# admin
docker exec -it brain-games-redis redis-cli GET "perm:cmpvdc2mi001bsq1ytjokorda"
docker exec -it brain-games-redis redis-cli TTL "perm:cmpvdc2mi001bsq1ytjokorda"