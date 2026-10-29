package vn.edu.hcmut.emobility.core.common;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.Version;

@MappedSuperclass
public abstract class VersionedEntity extends BaseEntity {
    @Version
    @Column(nullable = false)
    protected long version;

    public long getVersion() { return version; }
}